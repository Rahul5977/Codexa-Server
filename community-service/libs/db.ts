import pg from 'pg'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is not configured')
}

export const pool = new pg.Pool({
  connectionString,
  ssl:
    connectionString.includes('localhost') || connectionString.includes('127.0.0.1')
      ? false
      : connectionString.includes('sslmode=require')
        ? { rejectUnauthorized: false }
        : undefined,
})

    let ensureSchemaPromise: Promise<void> | null = null

export async function connectDB() {
  await pool.query('SELECT 1')
  console.log('✅ Community service DB connected')
}

export async function disconnectDB() {
  await pool.end()
  console.log('✅ Community service DB disconnected')
}

export async function ensureCommunitySchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS community_rooms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      host_user_id TEXT NOT NULL,
      invite_code TEXT UNIQUE,
      allow_late_join BOOLEAN NOT NULL DEFAULT TRUE,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      contest_duration_minutes INTEGER NULL,
      contest_started_at TIMESTAMP NULL,
      contest_ended_at TIMESTAMP NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `)

  await pool.query(`ALTER TABLE community_rooms ADD COLUMN IF NOT EXISTS contest_duration_minutes INTEGER NULL`)
  await pool.query(`ALTER TABLE community_rooms ADD COLUMN IF NOT EXISTS contest_started_at TIMESTAMP NULL`)
  await pool.query(`ALTER TABLE community_rooms ADD COLUMN IF NOT EXISTS contest_ended_at TIMESTAMP NULL`)
  await pool.query(`ALTER TABLE community_rooms ALTER COLUMN invite_code DROP NOT NULL`)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS community_room_members (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL REFERENCES community_rooms(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(room_id, user_id)
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS community_room_problems (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL REFERENCES community_rooms(id) ON DELETE CASCADE,
      problem_id TEXT NOT NULL,
      added_by TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(room_id, problem_id)
    )
  `)

  await pool.query(`
    ALTER TABLE community_room_members
    DROP CONSTRAINT IF EXISTS community_room_members_room_id_fkey
  `)

  await pool.query(`
    ALTER TABLE community_room_problems
    DROP CONSTRAINT IF EXISTS community_room_problems_room_id_fkey
  `)

  await pool.query(`
    ALTER TABLE community_rooms
    ALTER COLUMN id TYPE TEXT USING id::text,
    ALTER COLUMN host_user_id TYPE TEXT USING host_user_id::text
  `)

  await pool.query(`
    ALTER TABLE community_room_members
    ALTER COLUMN id TYPE TEXT USING id::text,
    ALTER COLUMN room_id TYPE TEXT USING room_id::text,
    ALTER COLUMN user_id TYPE TEXT USING user_id::text
  `)

  await pool.query(`
    ALTER TABLE community_room_problems
    ALTER COLUMN id TYPE TEXT USING id::text,
    ALTER COLUMN room_id TYPE TEXT USING room_id::text,
    ALTER COLUMN problem_id TYPE TEXT USING problem_id::text,
    ALTER COLUMN added_by TYPE TEXT USING added_by::text
  `)

  await pool.query(`
    ALTER TABLE community_room_members
    ADD CONSTRAINT community_room_members_room_id_fkey
    FOREIGN KEY (room_id) REFERENCES community_rooms(id) ON DELETE CASCADE
  `)

  await pool.query(`
    ALTER TABLE community_room_problems
    ADD CONSTRAINT community_room_problems_room_id_fkey
    FOREIGN KEY (room_id) REFERENCES community_rooms(id) ON DELETE CASCADE
  `)

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_community_rooms_host ON community_rooms(host_user_id)`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_community_room_members_user ON community_room_members(user_id)`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_community_room_problems_room ON community_room_problems(room_id)`)

  console.log('✅ Community schema ensured')
}

export function ensureCommunitySchemaReady() {
  if (!ensureSchemaPromise) {
    ensureSchemaPromise = ensureCommunitySchema().catch((error) => {
      ensureSchemaPromise = null
      throw error
    })
  }

  return ensureSchemaPromise
}
