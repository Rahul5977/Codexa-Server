import express from 'express'
import {
  addRoomProblems,
  endContest,
  createRoom,
  generateRoomInvite,
  getContestAnalysis,
  getLeaderboard,
  getMyRooms,
  getUserContestHistory,
  getRoomById,
  getRoomSubmissions,
  joinRoomByInvite,
  removeRoomProblems,
  startContest,
  updateRoomSettings,
} from '../controller/community.controller.js'
import { ensureCommunitySchemaReady } from '../libs/db.js'
import { authenticate } from '../middleware/auth.middleware.js'
const router = express.Router()

router.use(async (_req, _res, next) => {
  try {
    await ensureCommunitySchemaReady()
    next()
  } catch (error) {
    next(error)
  }
})

router.post('/rooms', authenticate, createRoom)
router.get('/rooms/my', authenticate, getMyRooms)
router.get('/users/:userId/contests', authenticate, getUserContestHistory)
router.post('/rooms/join/:inviteCode', authenticate, joinRoomByInvite)
router.get('/rooms/:roomId', authenticate, getRoomById)
router.patch('/rooms/:roomId/settings', authenticate, updateRoomSettings)
router.post('/rooms/:roomId/problems', authenticate, addRoomProblems)
router.post('/rooms/:roomId/problems/remove', authenticate, removeRoomProblems)
router.post('/rooms/:roomId/generate-invite', authenticate, generateRoomInvite)
router.post('/rooms/:roomId/start-contest', authenticate, startContest)
router.post('/rooms/:roomId/end-contest', authenticate, endContest)
router.get('/rooms/:roomId/leaderboard', authenticate, getLeaderboard)
router.get('/rooms/:roomId/analysis', authenticate, getContestAnalysis)

router.get('/rooms/:roomId/submissions', authenticate, getRoomSubmissions)
export default router
