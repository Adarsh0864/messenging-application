import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import { authMiddleware } from './middleware/auth';
import userRoutes from './routes/users';
import messageRoutes from './routes/messages';
import conversationRoutes from './routes/conversations';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Configure CORS for production
const allowedOrigins = [
  process.env.CLIENT_URL || "http://localhost:3000",
  "https://messenger-bgtjnobcu-adarsh0864s-projects.vercel.app",
  "https://*.vercel.app"
];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = process.env.PORT || 8000;

// Middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false
}));
app.use(morgan('combined'));
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.some(allowed => 
      allowed === origin || 
      (allowed.includes('*') && origin.includes('vercel.app'))
    )) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/users', userRoutes);
app.use('/api/messages', authMiddleware, messageRoutes);
app.use('/api/conversations', authMiddleware, conversationRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    port: PORT,
    env: process.env.NODE_ENV || 'development'
  });
});

// Root endpoint
app.get('/', (_req, res) => {
  res.json({ 
    message: 'Messaging Server API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      users: '/api/users',
      messages: '/api/messages',
      conversations: '/api/conversations'
    }
  });
});

// WebRTC Signaling with Socket.IO
interface User {
  id: string;
  socketId: string;
  name?: string;
}

const connectedUsers = new Map<string, User>();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // User joins with their Firebase UID
  socket.on('join', (userData: { uid: string; name?: string }) => {
    connectedUsers.set(userData.uid, {
      id: userData.uid,
      socketId: socket.id,
      name: userData.name
    });
    
    socket.join(userData.uid);
    console.log(`User ${userData.uid} joined with socket ${socket.id}`);
  });

  // Voice/Video call signaling
  socket.on('call:initiate', (data: { 
    to: string; 
    from: string; 
    signal: any; 
    type: 'audio' | 'video';
    callerName: string;
  }) => {
    const targetUser = connectedUsers.get(data.to);
    if (targetUser) {
      io.to(targetUser.socketId).emit('call:incoming', {
        from: data.from,
        signal: data.signal,
        type: data.type,
        callerName: data.callerName
      });
    }
  });

  socket.on('call:answer', (data: { to: string; signal: any }) => {
    const targetUser = connectedUsers.get(data.to);
    if (targetUser) {
      io.to(targetUser.socketId).emit('call:accepted', {
        signal: data.signal
      });
    }
  });

  socket.on('call:reject', (data: { to: string }) => {
    const targetUser = connectedUsers.get(data.to);
    if (targetUser) {
      io.to(targetUser.socketId).emit('call:rejected');
    }
  });

  socket.on('call:end', (data: { to: string }) => {
    const targetUser = connectedUsers.get(data.to);
    if (targetUser) {
      io.to(targetUser.socketId).emit('call:ended');
    }
  });

  // ICE candidate exchange
  socket.on('ice-candidate', (data: { to: string; candidate: any }) => {
    const targetUser = connectedUsers.get(data.to);
    if (targetUser) {
      io.to(targetUser.socketId).emit('ice-candidate', {
        candidate: data.candidate
      });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Remove from connected users
    for (const [uid, user] of connectedUsers.entries()) {
      if (user.socketId === socket.id) {
        connectedUsers.delete(uid);
        break;
      }
    }
  });

  // Real-time messaging (optional, can also use Firebase directly)
  socket.on('message:send', (data: {
    to: string;
    from: string;
    message: string;
    timestamp: string;
  }) => {
    const targetUser = connectedUsers.get(data.to);
    if (targetUser) {
      io.to(targetUser.socketId).emit('message:receive', data);
    }
  });

  // Typing indicators
  socket.on('typing:start', (data: { to: string; from: string }) => {
    const targetUser = connectedUsers.get(data.to);
    if (targetUser) {
      io.to(targetUser.socketId).emit('typing:start', { from: data.from });
    }
  });

  socket.on('typing:stop', (data: { to: string; from: string }) => {
    const targetUser = connectedUsers.get(data.to);
    if (targetUser) {
      io.to(targetUser.socketId).emit('typing:stop', { from: data.from });
    }
  });
});

// Error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// 404 handler
app.use('*', (_req: express.Request, res: express.Response) => {
  res.status(404).json({ message: 'Route not found' });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/health`);
}); 