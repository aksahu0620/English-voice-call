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
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

const io = new Server(server, {
  cors: {
    origin: allowedOrigins => {
      const origins = [
        process.env.CLIENT_URL,
        process.env.CLIENT_URL?.replace(/\/$/, ''),
        process.env.CLIENT_URL?.replace(/\/$/, '') + '/',
        'https://english-voice-call.vercel.app',
        'https://english-voice-call.vercel.app/'
      ].filter(Boolean);
      return origins.includes(allowedOrigins);
    },
    methods: ['GET', 'POST'],
    credentials: true
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

// Socket.io connection handling
io.on('connection', (socket) => {
  handleSocketConnection(socket, io);
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});