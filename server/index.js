require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const ws = require('ws');
const { executeCode, spawnInteractive } = require('./dockerService');
const { setupWSConnection } = require('y-websocket/bin/utils');

const app = express();
app.use(cors({ origin: 'http://localhost:5173', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }));
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || '';
if (MONGO_URI) {
  mongoose.set('bufferCommands', false); // Fail fast if DB connection is down
  mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 })
    .then(() => console.log('Connected to MongoDB successfully'))
    .catch(err => console.error('MongoDB connection error:', err.message));
} else {
  console.log('No MONGO_URI configured, skipping MongoDB connection.');
}

// Code execution route
app.post('/api/execute', async (req, res) => {
  const { language, code, files, input } = req.body;
  if (!language || (!code && (!files || files.length === 0))) {
    return res.status(400).json({ error: 'Language and code/files are required' });
  }

  try {
    const output = await executeCode(language, code, files, input);
    res.json({ output });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Error executing code' });
  }
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on('join-room', ({ roomId, userName }) => {
    if (!roomId) {
      return;
    }

    console.log(`Socket ${socket.id} joined room ${roomId} as ${userName}`);
    socket.join(roomId);
    socket.to(roomId).emit('chatMessage', {
      system: true,
      text: `${userName || 'Guest'} joined the room.`
    });
  });

  socket.on('send-chat', ({ roomId, userName, text }) => {
    if (!roomId || !text) {
      return;
    }

    console.log(`Room ${roomId} chat from ${userName}: ${text}`);
    io.to(roomId).emit('chatMessage', {
      userName,
      text,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('execute-interactive', ({ language, files }) => {
    spawnInteractive(socket, language, files);
  });

  socket.on('disconnect', (reason) => {
    console.log(`Socket disconnected: ${socket.id} (${reason})`);
  });
});

const wsServer = new ws.Server({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;

  if (pathname.startsWith('/socket.io')) {
    return;
  }

  wsServer.handleUpgrade(request, socket, head, (wsSocket) => {
    const room = pathname.slice(1) || 'default';
    setupWSConnection(wsSocket, request, { docName: room });
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
