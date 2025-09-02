const { createServer } = require('http')
const next = require('next')
const { Server } = require('socket.io')
const jwt = require('jsonwebtoken')

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

// JWT verification function
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key')
  } catch (error) {
    console.error('Token verification failed:', error)
    return null
  }
}

app.prepare().then(() => {
  const server = createServer((req, res) => handle(req, res))

  // Attach Socket.IO with CORS and authentication
  const io = new Server(server, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  })

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      // Get token from handshake auth or cookies
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers.authorization?.replace('Bearer ', '') ||
        socket.handshake.headers.cookie
          ?.split(';')
          .find((c) => c.trim().startsWith('auth-token='))
          ?.split('=')[1]

      if (!token) {
        console.log('Socket auth: No token provided')
        return next(new Error('Authentication error: No token provided'))
      }

      console.log(
        'Socket auth: Verifying token:',
        token.substring(0, 20) + '...',
      )
      const payload = verifyToken(token)

      if (!payload) {
        console.log('Socket auth: Invalid token')
        return next(new Error('Authentication error: Invalid token'))
      }

      console.log('Socket auth: Token verified for user:', payload.userId)

      // Attach user data to socket
      socket.userData = {
        userId: payload.userId,
        username: payload.username,
        email: payload.email,
      }

      // Emit auth success to client
      socket.emit('auth:success', socket.userData)

      next()
    } catch (error) {
      console.error('Socket auth error:', error)
      next(new Error('Authentication error: Token verification failed'))
    }
  })

  // A, B, C

  // A => B

  // B => C

  // A => C

  io.on('connection', (socket) => {
    console.log(`User ${socket.userData.username} connected: ${socket.id}`)

    // Handle manual auth verification
    socket.on('auth:verify', (token) => {
      try {
        const payload = verifyToken(token)
        if (payload) {
          socket.userData = {
            userId: payload.userId,
            username: payload.username,
            email: payload.email,
          }
          socket.emit('auth:success', socket.userData)
          console.log(
            `User ${socket.userData.username} authenticated via manual verification`,
          )
        } else {
          socket.emit('auth:error', 'Invalid token')
        }
      } catch (error) {
        socket.emit('auth:error', 'Token verification failed')
      }
    })

    // Join conversation room
    socket.on('join:conversation', (conversationId) => {
      if (!socket.userData?.userId) {
        socket.emit('auth:error', 'Not authenticated')
        return
      }
      socket.join(`conversation:${conversationId}`)
      console.log(
        `User ${socket.userData.username} joined conversation: ${conversationId}`,
      )
    })

    // Leave conversation room
    socket.on('leave:conversation', (conversationId) => {
      if (!socket.userData?.userId) {
        socket.emit('auth:error', 'Not authenticated')
        return
      }
      socket.leave(`conversation:${conversationId}`)
      console.log(
        `User ${socket.userData.username} left conversation: ${conversationId}`,
      )
    })

    // Handle typing indicators
    socket.on('message:typing', (conversationId) => {
      if (!socket.userData?.userId) {
        socket.emit('auth:error', 'Not authenticated')
        return
      }
      // Emit to other users in the room (excluding sender)
      socket
        .to(`conversation:${conversationId}`)
        .emit(
          'user:typing',
          conversationId,
          socket.userData.userId,
          socket.userData.username,
        )
    })

    socket.on('message:stop_typing', (conversationId) => {
      if (!socket.userData?.userId) {
        socket.emit('auth:error', 'Not authenticated')
        return
      }
      // Emit to other users in the room (excluding sender)
      socket
        .to(`conversation:${conversationId}`)
        .emit('user:stopped_typing', conversationId, socket.userData.userId)
    })

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(
        `User ${socket.userData?.username || 'Unknown'} disconnected: ${socket.id}`,
      )
    })
  })

  // Make io available globally for API routes
  global.io = io

  server.listen(3000, () => {
    console.log('🚀 Server running at http://localhost:3000')
    console.log('📡 Socket.IO server ready')
  })
})
