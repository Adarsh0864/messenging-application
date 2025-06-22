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
  "https://messenger-pej5hxm3e-adarsh0864s-projects.vercel.app",
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
  lastSeen?: Date;
}

const connectedUsers = new Map<string, User>();

// Periodic cleanup of stale connections
const CLEANUP_INTERVAL = 30000; // 30 seconds
const CONNECTION_TIMEOUT = 120000; // 2 minutes

setInterval(() => {
  const now = new Date();
  const staleUsers: string[] = [];
  
  console.log('🧹 Running connection cleanup...');
  
  for (const [uid, user] of connectedUsers.entries()) {
    const timeSinceLastSeen = now.getTime() - (user.lastSeen?.getTime() || 0);
    
    if (timeSinceLastSeen > CONNECTION_TIMEOUT) {
      console.log(`User ${uid} (${user.name}) appears stale (last seen: ${user.lastSeen})`);
      
      // Check if socket still exists and is connected
      const socket = io.sockets.sockets.get(user.socketId);
      if (!socket || socket.disconnected) {
        console.log(`Removing stale user ${uid} - socket not found or disconnected`);
        staleUsers.push(uid);
      } else {
        // Send a ping to verify if user is still responsive
        console.log(`Pinging potentially stale user ${uid}...`);
        socket.emit('ping');
        
        // Set up a timeout to remove if no response
        setTimeout(() => {
          const currentUser = connectedUsers.get(uid);
          if (currentUser && currentUser.lastSeen && 
              (now.getTime() - currentUser.lastSeen.getTime()) > CONNECTION_TIMEOUT) {
            console.log(`User ${uid} did not respond to ping, removing...`);
            connectedUsers.delete(uid);
            socket.disconnect();
            
            // Notify others about user going offline
            io.emit('user:offline', { uid, reason: 'Connection timeout' });
          }
        }, 10000); // 10 second timeout for ping response
      }
    }
  }
  
  // Remove stale users
  staleUsers.forEach(uid => {
    connectedUsers.delete(uid);
    io.emit('user:offline', { uid, reason: 'Stale connection' });
  });
  
  if (staleUsers.length > 0) {
    console.log(`🧹 Cleaned up ${staleUsers.length} stale connections`);
  }
  
  console.log(`🧹 Cleanup complete. Active users: ${connectedUsers.size}`);
}, CLEANUP_INTERVAL);

// Connection health monitoring
setInterval(() => {
  console.log(`📊 Connection Health Report:`);
  console.log(`   • Total connected users: ${connectedUsers.size}`);
  console.log(`   • Total socket connections: ${io.sockets.sockets.size}`);
  
  // Log users for debugging
  for (const [uid, user] of connectedUsers.entries()) {
    const socket = io.sockets.sockets.get(user.socketId);
    const socketStatus = socket ? (socket.connected ? 'connected' : 'disconnected') : 'not found';
    const lastSeenDiff = user.lastSeen ? Date.now() - user.lastSeen.getTime() : 'never';
    
    console.log(`   • User ${uid} (${user.name}): socket ${socketStatus}, last seen ${lastSeenDiff}ms ago`);
  }
}, 60000); // Every minute

// Handle graceful server shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Server shutting down gracefully...');
  
  // Notify all connected users about server shutdown
  io.emit('server:shutdown', { message: 'Server is restarting, please reconnect in a moment' });
  
  // Give users time to receive the message
  setTimeout(() => {
    process.exit(0);
  }, 2000);
});

process.on('SIGINT', () => {
  console.log('🛑 Server interrupted, shutting down...');
  
  // Notify all connected users
  io.emit('server:shutdown', { message: 'Server is restarting, please reconnect in a moment' });
  
  setTimeout(() => {
    process.exit(0);
  }, 2000);
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Enhanced user joining with connection validation
  socket.on('join', (data: { uid: string; name?: string }) => {
    console.log('User attempting to join:', data);
    
    // Enhanced user validation
    if (!data.uid) {
      console.log('Invalid user data received');
      socket.emit('connection:error', { message: 'Invalid user data' });
      return;
    }
    
    // Check if user is already connected with a different socket
    const existingUser = connectedUsers.get(data.uid);
    if (existingUser && existingUser.socketId !== socket.id) {
      console.log(`User ${data.uid} already connected with different socket, updating...`);
      
      // Close the old socket connection if it exists
      const oldSocket = io.sockets.sockets.get(existingUser.socketId);
      if (oldSocket) {
        console.log('Disconnecting old socket for user:', data.uid);
        oldSocket.disconnect();
      }
    }
    
    const user: User = {
      id: data.uid,
      socketId: socket.id,
      name: data.name,
      lastSeen: new Date()
    };
    
    connectedUsers.set(data.uid, user);
    console.log(`User ${data.uid} (${data.name}) connected with socket ${socket.id}`);
    console.log(`Total connected users: ${connectedUsers.size}`);
    
    // Notify the user of successful connection
    socket.emit('connection:success', { uid: data.uid });
    
    // Broadcast user coming online to all other users
    socket.broadcast.emit('user:online', { 
      uid: data.uid, 
      name: data.name 
    });
  });

  // NEW: Check user availability endpoint
  socket.on('call:check-user', (data: { targetId: string }) => {
    console.log(`Checking availability for user: ${data.targetId}`);
    
    const targetUser = connectedUsers.get(data.targetId);
    if (!targetUser) {
      console.log(`User ${data.targetId} not found in connected users`);
      socket.emit('call:user-unavailable', { 
        message: 'User is not online' 
      });
      return;
    }

    // Verify the socket is still connected
    const targetSocket = io.sockets.sockets.get(targetUser.socketId);
    if (!targetSocket || targetSocket.disconnected) {
      console.log(`User ${data.targetId} socket is disconnected, cleaning up...`);
      connectedUsers.delete(data.targetId);
      socket.emit('call:user-unavailable', { 
        message: 'User is no longer available' 
      });
      return;
    }

    // Update last seen time
    targetUser.lastSeen = new Date();
    connectedUsers.set(data.targetId, targetUser);
    
    console.log(`User ${data.targetId} is available`);
    socket.emit('call:user-available', { 
      targetId: data.targetId,
      targetName: targetUser.name
    });
  });

  // NEW: Handle reconnection requests
  socket.on('call:reconnect', (data: { to: string; from: string }) => {
    console.log(`Reconnection request from ${data.from} to ${data.to}`);
    
    const targetUser = connectedUsers.get(data.to);
    const callerUser = connectedUsers.get(data.from);
    
    if (!targetUser || !callerUser) {
      console.log('One or both users not available for reconnection');
      socket.emit('call:user-unavailable', { 
        message: 'User is no longer available for reconnection' 
      });
      return;
    }

    // Verify both sockets are still connected
    const targetSocket = io.sockets.sockets.get(targetUser.socketId);
    const callerSocket = io.sockets.sockets.get(callerUser.socketId);
    
    if (!targetSocket || !callerSocket || targetSocket.disconnected || callerSocket.disconnected) {
      console.log('One or both sockets disconnected during reconnection');
      if (!targetSocket || targetSocket.disconnected) {
        connectedUsers.delete(data.to);
      }
      if (!callerSocket || callerSocket.disconnected) {
        connectedUsers.delete(data.from);
      }
      socket.emit('call:user-unavailable', { 
        message: 'Connection lost during reconnection' 
      });
      return;
    }

    // Notify target user about reconnection attempt
    io.to(targetUser.socketId).emit('connection:recovered');
    
    // Notify caller about reconnection status
    socket.emit('connection:recovered');
    
    console.log(`Reconnection signals sent between ${data.from} and ${data.to}`);
  });

  // Enhanced call initiation with better validation
  socket.on('call:initiate', (data: {
    to: string;
    from: string;
    signal: any;
    type: 'audio' | 'video';
    callerName: string;
  }) => {
    console.log(`Call initiated from ${data.from} to ${data.to}, type: ${data.type}`);
    
    // Validate required fields
    if (!data.to || !data.from || !data.signal || !data.type) {
      console.log('Invalid call data received');
      socket.emit('call:error', { message: 'Invalid call data' });
      return;
    }
    
    const targetUser = connectedUsers.get(data.to);
    const callerUser = connectedUsers.get(data.from);
    
    if (!targetUser) {
      console.log(`Target user ${data.to} not found or offline`);
      socket.emit('call:user-unavailable', { 
        message: 'User is not available or offline' 
      });
      return;
    }

    if (!callerUser) {
      console.log(`Caller user ${data.from} not found`);
      socket.emit('call:user-unavailable', { 
        message: 'Invalid caller session' 
      });
      return;
    }

    // Enhanced socket validation - more lenient approach
    const targetSocket = io.sockets.sockets.get(targetUser.socketId);
    if (!targetSocket || targetSocket.disconnected) {
      console.log(`Target user ${data.to} socket disconnected or invalid`);
      connectedUsers.delete(data.to);
      socket.emit('call:user-unavailable', { 
        message: 'User is no longer available' 
      });
      return;
    }

    // Update last seen times
    targetUser.lastSeen = new Date();
    callerUser.lastSeen = new Date();
    connectedUsers.set(data.to, targetUser);
    connectedUsers.set(data.from, callerUser);
    
    // Send call notification to target user immediately (no ping validation)
    console.log(`Sending call notification to ${data.to}...`);
    io.to(targetUser.socketId).emit('call:incoming', {
      from: data.from,
      signal: data.signal,
      type: data.type,
      callerName: data.callerName
    });

    // Notify caller that call is ringing
    socket.emit('call:ringing', { to: data.to });
    
    console.log(`Call notification sent to ${data.to} successfully`);
  });

  socket.on('call:answer', (data: { to: string; signal: any }) => {
    console.log(`Call answered, sending signal to ${data.to}`);
    
    const targetUser = connectedUsers.get(data.to);
    if (!targetUser) {
      console.log(`Target user ${data.to} not found for answer`);
      return;
    }

    // Check if target socket is still connected
    const targetSocket = io.sockets.sockets.get(targetUser.socketId);
    if (!targetSocket) {
      console.log(`Target user ${data.to} socket disconnected during answer`);
      connectedUsers.delete(data.to);
      return;
    }

    io.to(targetUser.socketId).emit('call:accepted', {
      signal: data.signal
    });
    
    console.log(`Answer signal sent to ${data.to}`);
  });

  socket.on('call:reject', (data: { to: string }) => {
    console.log(`Call rejected, notifying ${data.to}`);
    
    const targetUser = connectedUsers.get(data.to);
    if (targetUser) {
      const targetSocket = io.sockets.sockets.get(targetUser.socketId);
      if (targetSocket) {
        io.to(targetUser.socketId).emit('call:rejected');
      }
    }
  });

  socket.on('call:end', (data: { to: string }) => {
    console.log(`Call ended, notifying ${data.to}`);
    
    const targetUser = connectedUsers.get(data.to);
    if (targetUser) {
      const targetSocket = io.sockets.sockets.get(targetUser.socketId);
      if (targetSocket) {
        io.to(targetUser.socketId).emit('call:ended');
      }
    }
  });

  // Enhanced ICE candidate exchange with validation
  socket.on('ice-candidate', (data: { to: string; candidate: any }) => {
    console.log(`ICE candidate exchange from ${socket.id} to ${data.to}`);
    
    if (!data.to || !data.candidate) {
      console.log('Invalid ICE candidate data');
      return;
    }
    
    const targetUser = connectedUsers.get(data.to);
    if (!targetUser) {
      console.log(`Target user ${data.to} not found for ICE candidate`);
      return;
    }

    // Enhanced socket validation for ICE candidates
    const targetSocket = io.sockets.sockets.get(targetUser.socketId);
    if (!targetSocket || targetSocket.disconnected) {
      console.log(`Target user ${data.to} socket disconnected during ICE exchange`);
      connectedUsers.delete(data.to);
      
      // Notify sender about connection issue
      socket.emit('call:user-unavailable', { 
        message: 'Connection lost during call setup' 
      });
      return;
    }

    // Validate ICE candidate format
    try {
      if (data.candidate && typeof data.candidate === 'object') {
        io.to(targetUser.socketId).emit('ice-candidate', {
          candidate: data.candidate
        });
        console.log(`ICE candidate successfully relayed to ${data.to}`);
      } else {
        console.log('Invalid ICE candidate format');
      }
    } catch (error) {
      console.error('Error processing ICE candidate:', error);
    }
  });

  // Enhanced heartbeat mechanism with connection health monitoring
  socket.on('ping', (data?: { timestamp?: number }) => {
    const now = Date.now();
    socket.emit('pong', { 
      timestamp: data?.timestamp || now,
      serverTime: now
    });
    
    // Update user's last seen time if they're in our connected users
    for (const [uid, user] of connectedUsers.entries()) {
      if (user.socketId === socket.id) {
        user.lastSeen = new Date();
        connectedUsers.set(uid, user);
        break;
      }
    }
  });

  // Enhanced disconnect handling with cleanup
  socket.on('disconnect', (reason) => {
    console.log(`User disconnected: ${socket.id}, reason: ${reason}`);
    
    // Find and remove from connected users
    let disconnectedUser: { uid: string; user: User } | null = null;
    for (const [uid, user] of connectedUsers.entries()) {
      if (user.socketId === socket.id) {
        disconnectedUser = { uid, user };
        console.log(`User ${uid} (${user.name}) disconnected`);
        connectedUsers.delete(uid);
        break;
      }
    }
    
    if (disconnectedUser) {
      // Notify others about user going offline
      socket.broadcast.emit('user:offline', { 
        uid: disconnectedUser.uid,
        reason: reason 
      });
      
      // If user was in a call, notify the other party
      socket.broadcast.emit('call:user-disconnected', {
        uid: disconnectedUser.uid,
        reason: 'User disconnected'
      });
    }
    
    console.log(`Total connected users after disconnect: ${connectedUsers.size}`);
  });

  // Enhanced error handling
  socket.on('error', (error) => {
    console.error(`Socket error for ${socket.id}:`, error);
    
    // Clean up user if socket has persistent errors
    for (const [uid, user] of connectedUsers.entries()) {
      if (user.socketId === socket.id) {
        console.log(`Removing user ${uid} due to socket error`);
        connectedUsers.delete(uid);
        socket.broadcast.emit('user:offline', { uid, reason: 'Connection error' });
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
      const targetSocket = io.sockets.sockets.get(targetUser.socketId);
      if (targetSocket) {
        io.to(targetUser.socketId).emit('message:receive', data);
      }
    }
  });

  // Typing indicators
  socket.on('typing:start', (data: { to: string; from: string }) => {
    const targetUser = connectedUsers.get(data.to);
    if (targetUser) {
      const targetSocket = io.sockets.sockets.get(targetUser.socketId);
      if (targetSocket) {
        io.to(targetUser.socketId).emit('typing:start', { from: data.from });
      }
    }
  });

  socket.on('typing:stop', (data: { to: string; from: string }) => {
    const targetUser = connectedUsers.get(data.to);
    if (targetUser) {
      const targetSocket = io.sockets.sockets.get(targetUser.socketId);
      if (targetSocket) {
        io.to(targetUser.socketId).emit('typing:stop', { from: data.from });
      }
    }
  });

  // Get online users (optional feature)
  socket.on('get:online-users', () => {
    const onlineUsers = Array.from(connectedUsers.values()).map(user => ({
      id: user.id,
      name: user.name,
      lastSeen: user.lastSeen
    }));
    socket.emit('online-users', onlineUsers);
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