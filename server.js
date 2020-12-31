const express = require('express')
const app = express()
const userRouter = require('./routes/users')
const callRouter = require('./routes/call')
const cors = require('cors')
const mongoose = require('mongoose')

// Dot env
// const dotenv = require('dotenv')
// dotenv.config()

// Port
const port = process.env.PORT || 5000

// Middlewares
app.use(cors())
app.use(express.json())
app.use('/', userRouter)
app.use('/', callRouter)

// Mongoose Connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true }, () => console.log("MongoDB Connected"))

// Socket.io Setup
const server = app.listen(port)
const io = require('socket.io')(server)

let socketList = {}

io.on('connection', (socket) => {
  //console.log(`New User connected: ${socket.id}`)

  socket.on('disconnect', () => {
    socket.disconnect()
    //console.log('User disconnected!')
  })

  socket.on('BE-check-user', ({ callId, userName }) => {
    let error = false

    io.sockets.in(callId).clients((err, clients) => {
      clients.forEach((client) => {
        if (socketList[client] == userName) {
          error = true
        }
      })
      socket.emit('FE-error-user-exist', { error })
    })
  })

  /**
   * Join Call
   */
  socket.on('BE-join-call', ({ callId, userName }) => {
    // Socket Join callname
    socket.join(callId)
    socketList[socket.id] = { userName, video: true, audio: true }

    // Set User List
    io.sockets.in(callId).clients((err, clients) => {
      try {
        const users = []
        clients.forEach((client) => {
          // Add User List
          users.push({ userId: client, info: socketList[client] })
        })
        socket.broadcast.to(callId).emit('FE-user-join', users)
        // io.sockets.in(roomId).emit('FE-user-join', users)
      } catch (e) {
        io.sockets.in(callId).emit('FE-error-user-exist', { err: true })
      }
    })
  })

  socket.on('BE-call-user', ({ userToCall, from, signal }) => {
    io.to(userToCall).emit('FE-receive-call', {
      signal,
      from,
      info: socketList[socket.id],
    })
  })

  socket.on('BE-accept-call', ({ signal, to }) => {
    io.to(to).emit('FE-call-accepted', {
      signal,
      answerId: socket.id,
    })
  })

  socket.on('BE-send-message', ({ callId, msg, sender }) => {
    io.sockets.in(callId).emit('FE-receive-message', { msg, sender })
  })

  socket.on('BE-leave-call', ({ callId, leaver }) => {
    delete socketList[socket.id]
    socket.broadcast
      .to(callId)
      .emit('FE-user-leave', { userId: socket.id, userName: [socket.id] })
    io.sockets.sockets[socket.id].leave(callId)
  })

  socket.on('BE-toggle-camera-audio', ({ callId, switchTarget }) => {
    if (switchTarget === 'video') {
      socketList[socket.id].video = !socketList[socket.id].video
    } else { 
      socketList[socket.id].audio = !socketList[socket.id].audio
    }
    socket.broadcast
      .to(callId)
      .emit('FE-toggle-camera', { userId: socket.id, switchTarget })
  })
})