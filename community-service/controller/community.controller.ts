import type { Request, Response } from 'express'
import { z } from 'zod'
import { pool } from '../libs/db.js'
import { emitRoomUpdated } from '../libs/socket.js'
import { ApiError } from '../utils/api-error.js'
import { ApiResponse } from '../utils/api-response.js'

const createRoomSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  invitedFriendIds: z.array(z.string().uuid()).default([]),
})

const roomSettingsSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  allowLateJoin: z.boolean().optional(),
  isActive: z.boolean().optional(),
  contestDurationMinutes: z.number().int().min(5).max(360).nullable().optional(),
})

const addProblemsSchema = z.object({
  problemIds: z.array(z.string().uuid()).min(1),
})

function makeInviteCode() {
  return Math.random().toString(36).slice(2, 10).toUpperCase()
}

type ContestStatus = 'NOT_STARTED' | 'ACTIVE' | 'ENDED'

type LeaderboardRow = {
  userId: string
  name: string
  email: string
  score: number
  solvedCount: number
  totalAttempts: number
  totalTimeSec: number
}

type ProblemAttemptAggregate = {
  userId: string
  problemId: string
  attempts: number
  firstAcceptedAt: Date | null
  bestAcceptedTime: number | null
  bestAcceptedMemory: number | null
  difficulty: string | null
}

type ContestSubmissionRow = {
  id: string
  userId: string
  userName: string
  problemId: string
  code: string
  languageId: number
  status: string
  executionTime: number | null
  memory: number | null
  submittedAt: Date
  attemptNumber: number
}

function getDifficultyBaseScore(difficulty: string | null | undefined): number {
  if (!difficulty) return 150
  if (difficulty === 'EASY') return 100
  if (difficulty === 'MEDIUM') return 200
  if (difficulty === 'HARD') return 300
  return 150
}

function getDifficultyMultiplier(difficulty: string | null | undefined): number {
  if (!difficulty) return 1.2
  if (difficulty === 'EASY') return 1
  if (difficulty === 'MEDIUM') return 1.6
  if (difficulty === 'HARD') return 2.3
  return 1.2
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function computeEfficiencyScore(params: {
  difficulty: string | null | undefined
  attempts: number
  elapsedSec: number | null
  contestDurationMinutes: number | null
  executionTime: number | null
  memory: number | null
  problemBestTime: number | null
  problemBestMemory: number | null
}): number {
  const {
    difficulty,
    attempts,
    elapsedSec,
    contestDurationMinutes,
    executionTime,
    memory,
    problemBestTime,
    problemBestMemory,
  } = params

  const attemptCount = Math.max(1, attempts)
  const difficultyMultiplier = getDifficultyMultiplier(difficulty)

  const timeEfficiency =
    executionTime && problemBestTime
      ? clamp(problemBestTime / executionTime, 0.1, 1)
      : 0.6

  const memoryEfficiency =
    memory && problemBestMemory
      ? clamp(problemBestMemory / memory, 0.1, 1)
      : 0.6

  const attemptEfficiency = clamp(1 / attemptCount, 0.15, 1)

  let speedEfficiency = 0.5
  if (
    contestDurationMinutes &&
    contestDurationMinutes > 0 &&
    elapsedSec !== null &&
    Number.isFinite(elapsedSec)
  ) {
    const elapsedRatio = elapsedSec / (contestDurationMinutes * 60)
    speedEfficiency = clamp(1 - elapsedRatio, 0, 1)
  }

  const blended =
    0.45 * timeEfficiency +
    0.25 * memoryEfficiency +
    0.2 * attemptEfficiency +
    0.1 * speedEfficiency

  return Math.max(0, Math.round(100 * difficultyMultiplier * blended))
}

function getContestStatus(startedAt: Date | null, endedAt: Date | null): ContestStatus {
  if (!startedAt) return 'NOT_STARTED'
  if (endedAt && endedAt.getTime() <= Date.now()) return 'ENDED'
  return 'ACTIVE'
}

function toDateOrNull(value: unknown): Date | null {
  if (!value) return null
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return null
  return date
}

async function getContestCore(roomId: string) {
  const [roomResult, membersResult, problemsResult] = await Promise.all([
    pool.query(
      `
        SELECT r.id, r.name, r.host_user_id, r.invite_code, r.allow_late_join, r.is_active,
               r.contest_duration_minutes, r.contest_started_at, r.contest_ended_at, r.created_at,
               u.name AS host_name
        FROM community_rooms r
        LEFT JOIN "User" u ON u.id = r.host_user_id
        WHERE r.id = $1
        LIMIT 1
      `,
      [roomId],
    ),
    pool.query(
      `
        SELECT m.user_id, m.role, m.created_at, u.name, u.email, u.image_url
        FROM community_room_members m
        LEFT JOIN "User" u ON u.id = m.user_id
        WHERE m.room_id = $1
        ORDER BY m.created_at ASC
      `,
      [roomId],
    ),
    pool.query(
      `
        SELECT rp.problem_id, rp.created_at, p.title, p.difficulty
        FROM community_room_problems rp
        LEFT JOIN "Problem" p ON p.id = rp.problem_id
        WHERE rp.room_id = $1
        ORDER BY rp.created_at DESC
      `,
      [roomId],
    ),
  ])

  if (roomResult.rowCount === 0) {
    throw ApiError.notFound('Room not found')
  }

  const room = roomResult.rows[0]
  const contestStartedAt = toDateOrNull(room.contest_started_at)
  const contestEndedAt = toDateOrNull(room.contest_ended_at)
  const contestStatus = getContestStatus(contestStartedAt, contestEndedAt)

  const solvedRows = await pool.query(
    `
      SELECT s."problemId" AS problem_id, s."userId" AS user_id, MIN(s."createdAt") AS first_solved_at
      FROM "submissions" s
      INNER JOIN community_room_members m
        ON m.user_id = s."userId"
       AND m.room_id = $1
      INNER JOIN community_room_problems rp
        ON rp.problem_id = s."problemId"
       AND rp.room_id = $1
      WHERE s.status = 'ACCEPTED'
        AND ($2::timestamp IS NULL OR s."createdAt" >= $2::timestamp)
        AND ($3::timestamp IS NULL OR s."createdAt" <= $3::timestamp)
      GROUP BY s."problemId", s."userId"
    `,
    [roomId, contestStartedAt, contestEndedAt],
  )

  const memberById = new Map(
    membersResult.rows.map((row) => [
      row.user_id,
      {
        userId: row.user_id as string,
        name: row.name as string,
        email: row.email as string,
        imageUrl: row.image_url as string | undefined,
        role: row.role as 'HOST' | 'PARTICIPANT',
        joinedAt: row.created_at,
      },
    ]),
  )

  const solvedByProblem = new Map<string, Array<{ userId: string; name: string; solvedAt: string }>>()

  for (const row of solvedRows.rows) {
    const list = solvedByProblem.get(row.problem_id) || []
    const member = memberById.get(row.user_id)
    list.push({
      userId: row.user_id,
      name: member?.name || 'Unknown',
      solvedAt: row.first_solved_at,
    })
    solvedByProblem.set(row.problem_id, list)
  }

  const problems = problemsResult.rows.map((row) => {
    const solvedBy = solvedByProblem.get(row.problem_id) || []
    return {
      problemId: row.problem_id,
      title: row.title,
      difficulty: row.difficulty,
      addedAt: row.created_at,
      solvedCount: solvedBy.length,
      solvedBy,
    }
  })

  return {
    room,
    contestStartedAt,
    contestEndedAt,
    contestStatus,
    members: Array.from(memberById.values()),
    problems,
  }
}

async function buildLeaderboard(roomId: string): Promise<LeaderboardRow[]> {
  const core = await getContestCore(roomId)
  const { contestStartedAt, contestEndedAt } = core

  const attemptRows = await pool.query(
    `
      SELECT
        s."userId" AS user_id,
        s."problemId" AS problem_id,
        COUNT(*) AS attempts,
        MIN(CASE WHEN s.status = 'ACCEPTED' THEN s."createdAt" END) AS first_accepted_at,
        MIN(CASE WHEN s.status = 'ACCEPTED' THEN s.time END) AS best_accepted_time,
        MIN(CASE WHEN s.status = 'ACCEPTED' THEN s.memory END) AS best_accepted_memory,
        MAX(p.difficulty) AS difficulty
      FROM "submissions" s
      INNER JOIN community_room_members m
        ON m.user_id = s."userId"
       AND m.room_id = $1
      INNER JOIN community_room_problems rp
        ON rp.problem_id = s."problemId"
       AND rp.room_id = $1
      LEFT JOIN "Problem" p
        ON p.id = s."problemId"
      WHERE
        ($2::timestamp IS NULL OR s."createdAt" >= $2::timestamp)
        AND ($3::timestamp IS NULL OR s."createdAt" <= $3::timestamp)
      GROUP BY s."userId", s."problemId"
    `,
    [roomId, contestStartedAt, contestEndedAt],
  )

  const memberRows = core.members
  const byUser = new Map<string, LeaderboardRow>()

  for (const member of memberRows) {
    byUser.set(member.userId, {
      userId: member.userId,
      name: member.name,
      email: member.email,
      score: 0,
      solvedCount: 0,
      totalAttempts: 0,
      totalTimeSec: 0,
    })
  }

  const totalMinutes = core.room.contest_duration_minutes as number | null
  const startTs = contestStartedAt?.getTime()

  const aggregates: ProblemAttemptAggregate[] = attemptRows.rows.map((row) => ({
    userId: row.user_id,
    problemId: row.problem_id,
    attempts: Number(row.attempts || 0),
    firstAcceptedAt: toDateOrNull(row.first_accepted_at),
    bestAcceptedTime: toNullableNumber(row.best_accepted_time),
    bestAcceptedMemory: toNullableNumber(row.best_accepted_memory),
    difficulty: row.difficulty || null,
  }))

  const problemBaselines = new Map<string, { bestTime: number | null; bestMemory: number | null }>()

  for (const aggregate of aggregates) {
    if (!aggregate.firstAcceptedAt) continue

    const baseline = problemBaselines.get(aggregate.problemId) || {
      bestTime: null,
      bestMemory: null,
    }

    if (
      aggregate.bestAcceptedTime !== null &&
      (baseline.bestTime === null || aggregate.bestAcceptedTime < baseline.bestTime)
    ) {
      baseline.bestTime = aggregate.bestAcceptedTime
    }

    if (
      aggregate.bestAcceptedMemory !== null &&
      (baseline.bestMemory === null || aggregate.bestAcceptedMemory < baseline.bestMemory)
    ) {
      baseline.bestMemory = aggregate.bestAcceptedMemory
    }

    problemBaselines.set(aggregate.problemId, baseline)
  }

  for (const aggregate of aggregates) {
    const entry = byUser.get(aggregate.userId)
    if (!entry) continue

    const attempts = aggregate.attempts
    entry.totalAttempts += attempts

    if (!aggregate.firstAcceptedAt) continue

    entry.solvedCount += 1
    const base = getDifficultyBaseScore(aggregate.difficulty)

    const acceptedAt = aggregate.firstAcceptedAt
    const elapsedSec = startTs ? Math.max(0, Math.floor((acceptedAt.getTime() - startTs) / 1000)) : null
    entry.totalTimeSec += elapsedSec ?? 0

    const problemBaseline = problemBaselines.get(aggregate.problemId) || {
      bestTime: null,
      bestMemory: null,
    }

    const efficiencyScore = computeEfficiencyScore({
      difficulty: aggregate.difficulty,
      attempts,
      elapsedSec,
      contestDurationMinutes: totalMinutes,
      executionTime: aggregate.bestAcceptedTime,
      memory: aggregate.bestAcceptedMemory,
      problemBestTime: problemBaseline.bestTime,
      problemBestMemory: problemBaseline.bestMemory,
    })

    entry.score += Math.max(0, Math.round(base * 0.35 + efficiencyScore * 0.65))
  }

  return Array.from(byUser.values()).sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score
    if (right.solvedCount !== left.solvedCount) return right.solvedCount - left.solvedCount
    if (left.totalTimeSec !== right.totalTimeSec) return left.totalTimeSec - right.totalTimeSec
    return left.totalAttempts - right.totalAttempts
  })
}

async function assertRoomMember(roomId: string, userId: string) {
  const memberCheck = await pool.query(
    'SELECT id FROM community_room_members WHERE room_id = $1 AND user_id = $2 LIMIT 1',
    [roomId, userId],
  )

  if (memberCheck.rowCount === 0) {
    throw ApiError.forbidden('You are not a member of this room')
  }
}

async function assertRoomHost(roomId: string, userId: string) {
  const roomResult = await pool.query(
    'SELECT host_user_id FROM community_rooms WHERE id = $1 LIMIT 1',
    [roomId],
  )

  if (roomResult.rowCount === 0) {
    throw ApiError.notFound('Room not found')
  }

  if (roomResult.rows[0].host_user_id !== userId) {
    throw ApiError.forbidden('Only host can perform this action')
  }
}

export const createRoom = async (req: Request, res: Response) => {
  const currentUserId = req.user?.userId
  if (!currentUserId) {
    throw ApiError.unauthorized('Authentication required')
  }

  const parsed = createRoomSchema.safeParse(req.body)
  if (!parsed.success) {
    throw ApiError.badRequest('Invalid room payload', parsed.error.flatten())
  }

  const roomId = crypto.randomUUID()
  const inviteCode = makeInviteCode()
  const roomName = parsed.data.name || 'Community Learning Room'

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    await client.query(
      `
        INSERT INTO community_rooms (id, name, host_user_id, invite_code)
        VALUES ($1, $2, $3, $4)
      `,
      [roomId, roomName, currentUserId, inviteCode],
    )

    await client.query(
      `
        INSERT INTO community_room_members (id, room_id, user_id, role)
        VALUES ($1, $2, $3, 'HOST')
      `,
      [crypto.randomUUID(), roomId, currentUserId],
    )

    await client.query('COMMIT')

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'

    return res.status(201).json(
      new ApiResponse(201, {
        id: roomId,
        name: roomName,
        inviteCode,
        joinLink: `${frontendUrl}/community/rooms/${roomId}?invite=${inviteCode}`,
        memberCount: 1,
      }, 'Community room created successfully'),
    )
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export const joinRoomByInvite = async (req: Request, res: Response) => {
  const currentUserId = req.user?.userId
  if (!currentUserId) {
    throw ApiError.unauthorized('Authentication required')
  }

  const inviteCode = Array.isArray(req.params.inviteCode) ? req.params.inviteCode[0] : req.params.inviteCode
  if (!inviteCode) {
    throw ApiError.badRequest('Invite code is required')
  }

  const roomResult = await pool.query(
    `
      SELECT id, name, invite_code, allow_late_join, is_active
      FROM community_rooms
      WHERE invite_code = $1
      LIMIT 1
    `,
    [inviteCode],
  )

  if (roomResult.rowCount === 0) {
    throw ApiError.notFound('Invalid invite link')
  }

  const room = roomResult.rows[0]

  if (!room.invite_code) {
    throw ApiError.badRequest('Invite link is not available yet')
  }

  if (!room.is_active) {
    throw ApiError.badRequest('This room is no longer active')
  }

  if (!room.allow_late_join) {
    const alreadyMember = await pool.query(
      'SELECT id FROM community_room_members WHERE room_id = $1 AND user_id = $2 LIMIT 1',
      [room.id, currentUserId],
    )

    if (alreadyMember.rowCount === 0) {
      throw ApiError.forbidden('Host has disabled joining for this room')
    }
  }

  await pool.query(
    `
      INSERT INTO community_room_members (id, room_id, user_id, role)
      VALUES ($1, $2, $3, 'PARTICIPANT')
      ON CONFLICT (room_id, user_id) DO NOTHING
    `,
    [crypto.randomUUID(), room.id, currentUserId],
  )

  emitRoomUpdated(room.id)

  return res.status(200).json(
    new ApiResponse(200, {
      roomId: room.id,
      roomName: room.name,
      inviteCode: room.invite_code,
    }, 'Joined room successfully'),
  )
}

export const getRoomById = async (req: Request, res: Response) => {
  const currentUserId = req.user?.userId
  if (!currentUserId) {
    throw ApiError.unauthorized('Authentication required')
  }

  const roomId = Array.isArray(req.params.roomId) ? req.params.roomId[0] : req.params.roomId
  if (!roomId) {
    throw ApiError.badRequest('Room id is required')
  }
  await assertRoomMember(roomId, currentUserId)

  const core = await getContestCore(roomId)
  const room = core.room
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'

  let inviteCode = room.invite_code as string | null
  if (!inviteCode) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = makeInviteCode()
      try {
        const updateResult = await pool.query(
          `
            UPDATE community_rooms
            SET invite_code = $1,
                updated_at = NOW()
            WHERE id = $2
              AND invite_code IS NULL
            RETURNING invite_code
          `,
          [candidate, room.id],
        )

        if (updateResult.rowCount != null && updateResult.rowCount > 0) {
          inviteCode = updateResult.rows[0].invite_code
          break
        }

        const existing = await pool.query(
          'SELECT invite_code FROM community_rooms WHERE id = $1 LIMIT 1',
          [room.id],
        )
        inviteCode = existing.rows[0]?.invite_code || null
        if (inviteCode) break
      } catch (error: any) {
        if (error?.code !== '23505') {
          throw error
        }
      }
    }
  }

  const joinLink = inviteCode ? `${frontendUrl}/community/rooms/${room.id}?invite=${inviteCode}` : null

  return res.status(200).json(
    new ApiResponse(200, {
      id: room.id,
      name: room.name,
      inviteCode,
      joinLink,
      allowLateJoin: room.allow_late_join,
      isActive: room.is_active,
      hostUserId: room.host_user_id,
      hostName: room.host_name,
      isHost: room.host_user_id === currentUserId,
      createdAt: room.created_at,
      contest: {
        durationMinutes: room.contest_duration_minutes,
        startedAt: core.contestStartedAt,
        endedAt: core.contestEndedAt,
        status: core.contestStatus,
      },
      members: core.members,
      problems: core.problems,
    }, 'Room fetched successfully'),
  )
}

export const getMyRooms = async (req: Request, res: Response) => {
  const currentUserId = req.user?.userId
  if (!currentUserId) {
    throw ApiError.unauthorized('Authentication required')
  }

  const roomsResult = await pool.query(
    `
      SELECT r.id,
             r.name,
             r.host_user_id,
             r.contest_started_at,
             r.contest_ended_at,
             r.created_at,
             r.updated_at
      FROM community_rooms r
      INNER JOIN community_room_members m
        ON m.room_id = r.id
      WHERE m.user_id = $1
      ORDER BY r.updated_at DESC, r.created_at DESC
    `,
    [currentUserId],
  )

  const rooms = roomsResult.rows.map((row) => {
    const startedAt = toDateOrNull(row.contest_started_at)
    const endedAt = toDateOrNull(row.contest_ended_at)

    return {
      id: row.id,
      name: row.name,
      isHost: row.host_user_id === currentUserId,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      contest: {
        startedAt,
        endedAt,
        status: getContestStatus(startedAt, endedAt),
      },
    }
  })

  return res.status(200).json(
    new ApiResponse(200, { rooms }, 'User rooms fetched successfully'),
  )
}

export const getUserContestHistory = async (req: Request, res: Response) => {
  const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId
  
  if (!userId) {
    throw ApiError.badRequest('User ID is required')
  }

  const roomsResult = await pool.query(
    `
      SELECT r.id,
             r.name,
             r.host_user_id,
             r.contest_started_at,
             r.contest_ended_at,
             r.created_at,
             r.updated_at
      FROM community_rooms r
      INNER JOIN community_room_members m
        ON m.room_id = r.id
      WHERE m.user_id = $1
        AND r.contest_ended_at IS NOT NULL
      ORDER BY r.contest_ended_at DESC, r.created_at DESC
    `,
    [userId],
  )

  const rooms = roomsResult.rows.map((row) => {
    const startedAt = toDateOrNull(row.contest_started_at)
    const endedAt = toDateOrNull(row.contest_ended_at)

    return {
      id: row.id,
      name: row.name,
      hostUserId: row.host_user_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      contest: {
        startedAt,
        endedAt,
        status: getContestStatus(startedAt, endedAt),
      },
    }
  })

  return res.status(200).json(
    new ApiResponse(200, { rooms }, 'User contest history fetched successfully'),
  )
}

export const updateRoomSettings = async (req: Request, res: Response) => {
  const currentUserId = req.user?.userId
  if (!currentUserId) {
    throw ApiError.unauthorized('Authentication required')
  }

  const roomId = Array.isArray(req.params.roomId) ? req.params.roomId[0] : req.params.roomId
  if (!roomId) {
    throw ApiError.badRequest('Room id is required')
  }
  await assertRoomHost(roomId, currentUserId)

  const parsed = roomSettingsSchema.safeParse(req.body)
  if (!parsed.success) {
    throw ApiError.badRequest('Invalid room settings', parsed.error.flatten())
  }

  const { name, allowLateJoin, isActive, contestDurationMinutes } = parsed.data

  await pool.query(
    `
      UPDATE community_rooms
      SET
        name = COALESCE($1, name),
        allow_late_join = COALESCE($2, allow_late_join),
        is_active = COALESCE($3, is_active),
        contest_duration_minutes = $4,
        updated_at = NOW()
      WHERE id = $5
    `,
    [name ?? null, allowLateJoin ?? null, isActive ?? null, contestDurationMinutes ?? null, roomId],
  )

  emitRoomUpdated(roomId)

  return res.status(200).json(new ApiResponse(200, null, 'Room settings updated'))
}

export const generateRoomInvite = async (req: Request, res: Response) => {
  const currentUserId = req.user?.userId
  if (!currentUserId) {
    throw ApiError.unauthorized('Authentication required')
  }

  const roomId = Array.isArray(req.params.roomId) ? req.params.roomId[0] : req.params.roomId
  if (!roomId) {
    throw ApiError.badRequest('Room id is required')
  }
  await assertRoomHost(roomId, currentUserId)

  const roomResult = await pool.query(
    `
      SELECT id, invite_code, contest_started_at
      FROM community_rooms
      WHERE id = $1
      LIMIT 1
    `,
    [roomId],
  )

  if (roomResult.rowCount === 0) {
    throw ApiError.notFound('Room not found')
  }

  const room = roomResult.rows[0]
  if (toDateOrNull(room.contest_started_at)) {
    throw ApiError.badRequest('Cannot generate invite after contest has started')
  }

  const problemsCountResult = await pool.query(
    'SELECT COUNT(*)::int AS total FROM community_room_problems WHERE room_id = $1',
    [roomId],
  )

  if ((problemsCountResult.rows[0]?.total || 0) === 0) {
    throw ApiError.badRequest('Add at least one problem before generating invite link')
  }

  let inviteCode = room.invite_code as string | null

  if (!inviteCode) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = makeInviteCode()
      try {
        const updateResult = await pool.query(
          `
            UPDATE community_rooms
            SET invite_code = $1,
                updated_at = NOW()
            WHERE id = $2
              AND invite_code IS NULL
            RETURNING invite_code
          `,
          [candidate, roomId],
        )

        if (updateResult.rowCount != null && updateResult.rowCount > 0) {
          inviteCode = updateResult.rows[0].invite_code
          break
        }

        const existing = await pool.query(
          'SELECT invite_code FROM community_rooms WHERE id = $1 LIMIT 1',
          [roomId],
        )
        inviteCode = existing.rows[0]?.invite_code || null
        if (inviteCode) break
      } catch (error: any) {
        if (error?.code !== '23505') {
          throw error
        }
      }
    }
  }

  if (!inviteCode) {
    throw ApiError.badRequest('Failed to generate invite code, please try again')
  }

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
  const joinLink = `${frontendUrl}/community/rooms/${roomId}?invite=${inviteCode}`

  emitRoomUpdated(roomId)

  return res.status(200).json(
    new ApiResponse(200, { inviteCode, joinLink }, 'Invite link generated successfully'),
  )
}

export const startContest = async (req: Request, res: Response) => {
  const currentUserId = req.user?.userId
  if (!currentUserId) {
    throw ApiError.unauthorized('Authentication required')
  }

  const roomId = Array.isArray(req.params.roomId) ? req.params.roomId[0] : req.params.roomId
  if (!roomId) {
    throw ApiError.badRequest('Room id is required')
  }

  await assertRoomHost(roomId, currentUserId)

  const core = await getContestCore(roomId)
  if (core.contestStatus === 'ACTIVE') {
    throw ApiError.badRequest('Contest is already active')
  }

  if (core.problems.length === 0) {
    throw ApiError.badRequest('Add at least one problem before starting contest')
  }

  const startedAt = new Date()
  const durationMinutes = core.room.contest_duration_minutes as number | null
  const endedAt = durationMinutes ? new Date(startedAt.getTime() + durationMinutes * 60 * 1000) : null

  await pool.query(
    `
      UPDATE community_rooms
      SET contest_started_at = $1,
          contest_ended_at = $2,
          updated_at = NOW()
      WHERE id = $3
    `,
    [startedAt, endedAt, roomId],
  )

  emitRoomUpdated(roomId)

  return res.status(200).json(
    new ApiResponse(200, { startedAt, endedAt }, 'Contest started successfully'),
  )
}

export const endContest = async (req: Request, res: Response) => {
  const currentUserId = req.user?.userId
  if (!currentUserId) {
    throw ApiError.unauthorized('Authentication required')
  }

  const roomId = Array.isArray(req.params.roomId) ? req.params.roomId[0] : req.params.roomId
  if (!roomId) {
    throw ApiError.badRequest('Room id is required')
  }

  await assertRoomHost(roomId, currentUserId)

  const endedAt = new Date()
  await pool.query(
    `
      UPDATE community_rooms
      SET contest_ended_at = $1,
          updated_at = NOW()
      WHERE id = $2
    `,
    [endedAt, roomId],
  )

  emitRoomUpdated(roomId)

  return res.status(200).json(new ApiResponse(200, { endedAt }, 'Contest ended successfully'))
}

export const getLeaderboard = async (req: Request, res: Response) => {
  const currentUserId = req.user?.userId
  if (!currentUserId) {
    throw ApiError.unauthorized('Authentication required')
  }

  const roomId = Array.isArray(req.params.roomId) ? req.params.roomId[0] : req.params.roomId
  if (!roomId) {
    throw ApiError.badRequest('Room id is required')
  }

  await assertRoomMember(roomId, currentUserId)
  const leaderboard = await buildLeaderboard(roomId)

  return res.status(200).json(new ApiResponse(200, { leaderboard }, 'Leaderboard fetched'))
}

export const getContestAnalysis = async (req: Request, res: Response) => {
  const currentUserId = req.user?.userId
  if (!currentUserId) {
    throw ApiError.unauthorized('Authentication required')
  }

  const roomId = Array.isArray(req.params.roomId) ? req.params.roomId[0] : req.params.roomId
  if (!roomId) {
    throw ApiError.badRequest('Room id is required')
  }

  await assertRoomMember(roomId, currentUserId)
  const core = await getContestCore(roomId)

  if (core.contestStatus !== 'ENDED') {
    throw ApiError.badRequest('Contest analysis is available after contest ends')
  }

  const leaderboard = await buildLeaderboard(roomId)

  const attemptsByProblem = await pool.query(
    `
      SELECT s."problemId" AS problem_id, COUNT(*) AS attempts,
             COUNT(*) FILTER (WHERE s.status = 'ACCEPTED') AS accepted_count
      FROM "submissions" s
      INNER JOIN community_room_members m
        ON m.user_id = s."userId"
       AND m.room_id = $1
      INNER JOIN community_room_problems rp
        ON rp.problem_id = s."problemId"
       AND rp.room_id = $1
      WHERE
        ($2::timestamp IS NULL OR s."createdAt" >= $2::timestamp)
        AND ($3::timestamp IS NULL OR s."createdAt" <= $3::timestamp)
      GROUP BY s."problemId"
    `,
    [roomId, core.contestStartedAt, core.contestEndedAt],
  )

  const attemptsMap = new Map(
    attemptsByProblem.rows.map((row) => [
      row.problem_id,
      {
        attempts: Number(row.attempts || 0),
        acceptedCount: Number(row.accepted_count || 0),
      },
    ]),
  )

  const problemBreakdown = core.problems.map((problem) => {
    const attemptMeta = attemptsMap.get(problem.problemId)
    const firstSolver = problem.solvedBy.length > 0
      ? [...problem.solvedBy].sort(
          (left, right) => new Date(left.solvedAt).getTime() - new Date(right.solvedAt).getTime(),
        )[0]
      : null

    return {
      problemId: problem.problemId,
      title: problem.title,
      difficulty: problem.difficulty,
      solvedCount: problem.solvedCount,
      acceptedSubmissions: attemptMeta?.acceptedCount || 0,
      totalAttempts: attemptMeta?.attempts || 0,
      firstSolver,
    }
  })

  const contestSubmissions = await pool.query(
    `
      SELECT
        s.id,
        s."userId" AS user_id,
        u.name AS user_name,
        s."problemId" AS problem_id,
        s.code,
        s."languageId" AS language_id,
        s.status,
        s.time,
        s.memory,
        s."createdAt" AS created_at,
        ROW_NUMBER() OVER (
          PARTITION BY s."userId", s."problemId"
          ORDER BY s."createdAt" ASC
        ) AS attempt_number
      FROM "submissions" s
      INNER JOIN community_room_members m
        ON m.user_id = s."userId"
       AND m.room_id = $1
      INNER JOIN community_room_problems rp
        ON rp.problem_id = s."problemId"
       AND rp.room_id = $1
      INNER JOIN "User" u
        ON u.id = s."userId"
      WHERE
        ($2::timestamp IS NULL OR s."createdAt" >= $2::timestamp)
        AND ($3::timestamp IS NULL OR s."createdAt" <= $3::timestamp)
      ORDER BY s."problemId", s."userId", s."createdAt" ASC
    `,
    [roomId, core.contestStartedAt, core.contestEndedAt],
  )

  const submissionRows: ContestSubmissionRow[] = contestSubmissions.rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    problemId: row.problem_id,
    code: row.code,
    languageId: Number(row.language_id),
    status: row.status,
    executionTime: toNullableNumber(row.time),
    memory: toNullableNumber(row.memory),
    submittedAt: new Date(String(row.created_at)),
    attemptNumber: Number(row.attempt_number || 1),
  }))

  const byProblem = new Map<string, ContestSubmissionRow[]>()
  for (const row of submissionRows) {
    const list = byProblem.get(row.problemId) || []
    list.push(row)
    byProblem.set(row.problemId, list)
  }

  const contestDurationMinutes = core.room.contest_duration_minutes as number | null
  const contestStartTs = core.contestStartedAt?.getTime() ?? null

  const perProblemUserAnalysis = core.problems.map((problem) => {
    const rows = byProblem.get(problem.problemId) || []
    const accepted = rows.filter((row) => row.status === 'ACCEPTED')

    const bestTime = accepted.reduce<number | null>((best, row) => {
      if (row.executionTime === null) return best
      if (best === null || row.executionTime < best) return row.executionTime
      return best
    }, null)

    const bestMemory = accepted.reduce<number | null>((best, row) => {
      if (row.memory === null) return best
      if (best === null || row.memory < best) return row.memory
      return best
    }, null)

    const scoredAccepted = accepted.map((row) => {
      const elapsedSec = contestStartTs
        ? Math.max(0, Math.floor((row.submittedAt.getTime() - contestStartTs) / 1000))
        : null

      return {
        ...row,
        efficiencyScore: computeEfficiencyScore({
          difficulty: problem.difficulty,
          attempts: row.attemptNumber,
          elapsedSec,
          contestDurationMinutes,
          executionTime: row.executionTime,
          memory: row.memory,
          problemBestTime: bestTime,
          problemBestMemory: bestMemory,
        }),
      }
    })

    const optimalSubmission = scoredAccepted.sort((left, right) => {
      if (right.efficiencyScore !== left.efficiencyScore) {
        return right.efficiencyScore - left.efficiencyScore
      }

      const leftTime = left.executionTime ?? Number.MAX_SAFE_INTEGER
      const rightTime = right.executionTime ?? Number.MAX_SAFE_INTEGER
      if (leftTime !== rightTime) return leftTime - rightTime

      const leftMemory = left.memory ?? Number.MAX_SAFE_INTEGER
      const rightMemory = right.memory ?? Number.MAX_SAFE_INTEGER
      if (leftMemory !== rightMemory) return leftMemory - rightMemory

      return left.submittedAt.getTime() - right.submittedAt.getTime()
    })[0] || null

    const userRows = rows.filter((row) => row.userId === currentUserId)
    const userAcceptedRows = userRows
      .filter((row) => row.status === 'ACCEPTED')
      .map((row) => {
        const elapsedSec = contestStartTs
          ? Math.max(0, Math.floor((row.submittedAt.getTime() - contestStartTs) / 1000))
          : null

        return {
          ...row,
          efficiencyScore: computeEfficiencyScore({
            difficulty: problem.difficulty,
            attempts: row.attemptNumber,
            elapsedSec,
            contestDurationMinutes,
            executionTime: row.executionTime,
            memory: row.memory,
            problemBestTime: bestTime,
            problemBestMemory: bestMemory,
          }),
        }
      })

    const userBestAccepted = userAcceptedRows.sort((left, right) => {
      if (right.efficiencyScore !== left.efficiencyScore) {
        return right.efficiencyScore - left.efficiencyScore
      }
      return left.submittedAt.getTime() - right.submittedAt.getTime()
    })[0] || null

    const userLatestAttempt = userRows[userRows.length - 1] || null

    const userSubmission = userBestAccepted ||
      (userLatestAttempt
        ? {
            ...userLatestAttempt,
            efficiencyScore: 0,
          }
        : null)

    const comparisonSummary = (() => {
      if (!optimalSubmission && !userSubmission) {
        return 'No submissions were made for this problem.'
      }

      if (!optimalSubmission) {
        return 'No accepted solution available for this problem.'
      }

      if (!userSubmission) {
        return 'You did not submit this problem during the contest.'
      }

      if (userSubmission.status !== 'ACCEPTED') {
        return 'Your latest submission was not accepted; review the optimal accepted approach.'
      }

      const delta = userSubmission.efficiencyScore - optimalSubmission.efficiencyScore
      if (delta >= 0) {
        return 'Your accepted solution matches or exceeds the current optimal efficiency score.'
      }

      return `Your accepted solution is ${Math.abs(delta)} efficiency points behind the optimal one.`
    })()

    return {
      problemId: problem.problemId,
      title: problem.title,
      difficulty: problem.difficulty,
      optimalSolution: optimalSubmission
        ? {
            submissionId: optimalSubmission.id,
            userId: optimalSubmission.userId,
            userName: optimalSubmission.userName,
            code: optimalSubmission.code,
            languageId: optimalSubmission.languageId,
            status: optimalSubmission.status,
            executionTime: optimalSubmission.executionTime,
            memory: optimalSubmission.memory,
            submittedAt: optimalSubmission.submittedAt,
            attemptsToSolve: optimalSubmission.attemptNumber,
            efficiencyScore: optimalSubmission.efficiencyScore,
          }
        : null,
      userSolution: userSubmission
        ? {
            submissionId: userSubmission.id,
            userId: userSubmission.userId,
            userName: userSubmission.userName,
            code: userSubmission.code,
            languageId: userSubmission.languageId,
            status: userSubmission.status,
            executionTime: userSubmission.executionTime,
            memory: userSubmission.memory,
            submittedAt: userSubmission.submittedAt,
            attemptsToSolve: userSubmission.attemptNumber,
            efficiencyScore: userSubmission.efficiencyScore,
          }
        : null,
      comparison: {
        summary: comparisonSummary,
        efficiencyDelta:
          optimalSubmission && userSubmission
            ? userSubmission.efficiencyScore - optimalSubmission.efficiencyScore
            : null,
        timeDelta:
          optimalSubmission && userSubmission &&
          optimalSubmission.executionTime !== null &&
          userSubmission.executionTime !== null
            ? userSubmission.executionTime - optimalSubmission.executionTime
            : null,
        memoryDelta:
          optimalSubmission && userSubmission &&
          optimalSubmission.memory !== null &&
          userSubmission.memory !== null
            ? userSubmission.memory - optimalSubmission.memory
            : null,
        attemptsDelta:
          optimalSubmission && userSubmission
            ? userSubmission.attemptNumber - optimalSubmission.attemptNumber
            : null,
      },
    }
  })

  const currentMember = core.members.find((member) => member.userId === currentUserId)

  return res.status(200).json(
    new ApiResponse(200, {
      overview: {
        totalMembers: core.members.length,
        totalProblems: core.problems.length,
        durationMinutes: core.room.contest_duration_minutes,
        startedAt: core.contestStartedAt,
        endedAt: core.contestEndedAt,
      },
      leaderboard,
      problemBreakdown,
      currentUser: {
        userId: currentUserId,
        name: currentMember?.name || 'You',
      },
      perProblemUserAnalysis,
    }, 'Contest analysis fetched successfully'),
  )
}

export const addRoomProblems = async (req: Request, res: Response) => {
  const currentUserId = req.user?.userId
  if (!currentUserId) {
    throw ApiError.unauthorized('Authentication required')
  }

  const roomId = Array.isArray(req.params.roomId) ? req.params.roomId[0] : req.params.roomId
  if (!roomId) {
    throw ApiError.badRequest('Room id is required')
  }
  await assertRoomHost(roomId, currentUserId)

  const parsed = addProblemsSchema.safeParse(req.body)
  if (!parsed.success) {
    throw ApiError.badRequest('Invalid problem payload', parsed.error.flatten())
  }

  const uniqueProblemIds = [...new Set(parsed.data.problemIds)]

  const existingProblems = await pool.query(
    'SELECT id FROM "Problem" WHERE id = ANY($1::text[])',
    [uniqueProblemIds],
  )

  const existingSet = new Set(existingProblems.rows.map((row) => row.id))
  const validProblemIds = uniqueProblemIds.filter((id) => existingSet.has(id))

  if (validProblemIds.length === 0) {
    throw ApiError.badRequest('No valid problems found for provided IDs')
  }

  for (const problemId of validProblemIds) {
    await pool.query(
      `
        INSERT INTO community_room_problems (id, room_id, problem_id, added_by)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (room_id, problem_id) DO NOTHING
      `,
      [crypto.randomUUID(), roomId, problemId, currentUserId],
    )
  }

  emitRoomUpdated(roomId)

  return res.status(200).json(
    new ApiResponse(200, { addedProblemIds: validProblemIds }, 'Problems added to room'),
  )
}

export const removeRoomProblems = async (req: Request, res: Response) => {
  const currentUserId = req.user?.userId
  if (!currentUserId) {
    throw ApiError.unauthorized('Authentication required')
  }

  const roomId = Array.isArray(req.params.roomId) ? req.params.roomId[0] : req.params.roomId
  if (!roomId) {
    throw ApiError.badRequest('Room id is required')
  }
  await assertRoomHost(roomId, currentUserId)

  const parsed = addProblemsSchema.safeParse(req.body)
  if (!parsed.success) {
    throw ApiError.badRequest('Invalid problem payload', parsed.error.flatten())
  }

  const uniqueProblemIds = [...new Set(parsed.data.problemIds)]

  const deleteResult = await pool.query(
    `
      DELETE FROM community_room_problems
      WHERE room_id = $1
        AND problem_id = ANY($2::text[])
      RETURNING problem_id
    `,
    [roomId, uniqueProblemIds],
  )

  const removedProblemIds = deleteResult.rows.map((row) => row.problem_id)

  emitRoomUpdated(roomId)

  return res.status(200).json(
    new ApiResponse(200, { removedProblemIds }, 'Problems removed from room'),
  )
}

  export const getRoomSubmissions = async (req: Request, res: Response) => {
    const currentUserId = req.user?.userId
    if (!currentUserId) {
      throw ApiError.unauthorized('Authentication required')
    }

    const roomId = Array.isArray(req.params.roomId) ? req.params.roomId[0] : req.params.roomId
    if (!roomId) {
      throw ApiError.badRequest('Room id is required')
    }

    await assertRoomMember(roomId, currentUserId)
    const core = await getContestCore(roomId)

    if (core.contestStatus !== 'ENDED') {
      throw ApiError.badRequest('Submissions are available after contest ends')
    }

    // Fetch all submissions from room members during the contest period
    const submissionsQuery = await pool.query(
      `
        SELECT 
          s.id,
          s."userId",
          u.name AS user_name,
          s."problemId",
          p.title AS problem_title,
          p.difficulty,
          s.code,
          s."languageId",
          s.status,
          s.time,
          s.memory,
          s."createdAt"
        FROM "submissions" s
        INNER JOIN community_room_members m ON m.user_id = s."userId" AND m.room_id = $1
        INNER JOIN community_room_problems rp ON rp.problem_id = s."problemId" AND rp.room_id = $1
        INNER JOIN "User" u ON u.id = s."userId"
        INNER JOIN "Problem" p ON p.id = s."problemId"
        WHERE
          ($2::timestamp IS NULL OR s."createdAt" >= $2::timestamp)
          AND ($3::timestamp IS NULL OR s."createdAt" <= $3::timestamp)
        ORDER BY p.title, s."createdAt" DESC
      `,
      [roomId, core.contestStartedAt, core.contestEndedAt],
    )

    const submissions = submissionsQuery.rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      userName: row.user_name,
      problemId: row.problemId,
      problemTitle: row.problem_title,
      difficulty: row.difficulty,
      code: row.code,
      languageId: row.languageId,
      status: row.status,
      executionTime: row.time ? parseFloat(row.time) : null,
      memory: row.memory ? parseInt(row.memory) : null,
      submittedAt: row.createdAt,
    }))

    return res.status(200).json(
      new ApiResponse(200, { submissions }, 'Room submissions fetched successfully'),
    )
  }
