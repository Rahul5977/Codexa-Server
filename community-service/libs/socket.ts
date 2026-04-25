import type { Server as HttpServer } from 'http'
import { Server } from 'socket.io'

let ioInstance: Server | null = null

export function initSocket(server: HttpServer) {
  ioInstance = new Server(server, {
    cors: {
      origin: true,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  })

  ioInstance.on('connection', (socket) => {
    socket.on('room:join', (roomId: string) => {
      if (!roomId) return
      socket.join(`community-room:${roomId}`)
    })

    socket.on('room:leave', (roomId: string) => {
      if (!roomId) return
      socket.leave(`community-room:${roomId}`)
    })
  })

  return ioInstance
}

export function emitRoomUpdated(roomId: string) {
  if (!ioInstance || !roomId) return
  ioInstance.to(`community-room:${roomId}`).emit('room:updated', {
    roomId,
    timestamp: Date.now(),
  })
}

export function closeSocket() {
  if (!ioInstance) return
  ioInstance.close()
  ioInstance = null
}
