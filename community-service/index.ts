import dotenv from 'dotenv'
import app from './app.js'
import { connectDB, disconnectDB, ensureCommunitySchema, pool } from './libs/db.js'
import { createServer } from 'http'
import { closeSocket, emitRoomUpdated, initSocket } from './libs/socket.js'

dotenv.config({ override: true })

const PORT = Number(process.env.PORT || 8007)
let roomTicker: NodeJS.Timeout | null = null

async function gracefulShutdown(signal: string) {
  console.log(`\n${signal} received. Shutting down community-service...`)
  if (roomTicker) {
    clearInterval(roomTicker)
    roomTicker = null
  }
  closeSocket()
  await disconnectDB()
  process.exit(0)
}

process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => void gracefulShutdown('SIGINT'))

async function bootstrap() {
  try {
    await connectDB()
    await ensureCommunitySchema()

    const httpServer = createServer(app)
    initSocket(httpServer)

    roomTicker = setInterval(async () => {
      try {
        const rows = await pool.query(
          `
            SELECT id
            FROM community_rooms
            WHERE contest_started_at IS NOT NULL
          `,
        )

        for (const row of rows.rows) {
          emitRoomUpdated(row.id as string)
        }
      } catch (error) {
        console.error('Community room ticker error:', error)
      }
    }, 3000)

    httpServer.listen(PORT, () => {
      console.log(`🚀 Community service running on port ${PORT}`)
      console.log(`🔗 API base: http://localhost:${PORT}/api/community`)
    })
  } catch (error) {
    console.error('❌ Failed to start community-service:', error)
    process.exit(1)
  }
}

void bootstrap()
