import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';

// Import routes
import authRoutes from './routes/auth.js';
import friendRoutes from './routes/friends.js';
import callRoutes from './routes/calls.js';

// Import socket handlers
import { handleSocketConnection } from './services/socketService.js';

dotenv.config();

const app = express();
const server = createServer(app);

// CORS configuration function
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      process.env.CLIENT_URL,
      process.env.CLIENT_URL?.replace(/\/$/, ''), // Remove trailing slash
      process.env.CLIENT_URL?.replace(/\/$/, '') + '/', // Add trailing slash
      'https://english-voice-call.vercel.app',
      'https://english-voice-call.vercel.app/'
    ].filter(Boolean);
    
    console.log('CORS check - Origin:', origin);
    console.log('Allowed origins:', allowedOrigins);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  preflightContinue: false,
  optionsSuccessStatus: 204
};

const io = new Server(server, {
  cors: {
    origin: true, // Allow all origins for Socket.io
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
  },
  allowEIO3: true,
  transports: ['polling'], // Use polling only for Render compatibility
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 10000,
  maxHttpBufferSize: 1e6,
  allowRequest: (req, callback) => {
    // Allow all Socket.io requests
    callback(null, true);
  }
});

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/friends', ClerkExpressRequireAuth(), friendRoutes);
app.use('/api/calls', ClerkExpressRequireAuth(), callRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    clientUrl: process.env.CLIENT_URL,
    environment: process.env.NODE_ENV || 'development'
  });
});

// Socket.io test endpoint
app.get('/socket-test', (req, res) => {
  res.json({ 
    status: 'socket_ready',
    timestamp: new Date().toISOString(),
    activeConnections: io.engine.clientsCount,
    transports: ['polling']
  });
});

// Socket.io endpoint test
app.get('/socket.io/', (req, res) => {
  res.json({ 
    status: 'socket_io_endpoint_working',
    timestamp: new Date().toISOString()
  });
});

// Socket.io connection handling with authentication
io.use((socket, next) => {
  console.log('Socket.io middleware - Socket ID:', socket.id);
  console.log('Socket.io middleware - Auth:', socket.handshake.auth);
  console.log('Socket.io middleware - Headers:', socket.handshake.headers);
  
  // For now, allow all connections (we'll authenticate in the handler)
  next();
});

io.on('connection', (socket) => {
  console.log('🔌 New socket connection:', socket.id);
  console.log('🔌 Socket auth:', socket.handshake.auth);
  console.log('🔌 Socket headers:', socket.handshake.headers);
  
  // Send immediate confirmation
  socket.emit('connection_confirmed', { 
    socketId: socket.id, 
    timestamp: new Date().toISOString() 
  });
  
  handleSocketConnection(socket, io);
  
  socket.on('disconnect', (reason) => {
    console.log('🔌 Socket disconnected:', socket.id, 'Reason:', reason);
  });
  
  // Keep-alive ping
  socket.on('ping', () => {
    socket.emit('pong', { timestamp: new Date().toISOString() });
  });
  
  // Error handling
  socket.on('error', (error) => {
    console.error('🔌 Socket error:', socket.id, error);
  });
});

// Error handling for the server
server.on('error', (error) => {
  console.error('🚨 Server error:', error);
});

io.engine.on('connection_error', (err) => {
  console.error('🚨 Socket.io connection error:', err);
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Client URL: ${process.env.CLIENT_URL}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
});