# English Communication Voice Platform - Complete Implementation Guide

## 🚀 Project Structure

```
english-voice-platform/
├── client/                     # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   ├── call/
│   │   │   ├── friends/
│   │   │   ├── history/
│   │   │   └── ui/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── store/
│   │   └── utils/
│   ├── package.json
│   └── vite.config.js
├── server/                     # Node.js backend
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/
│   ├── package.json
│   └── server.js
└── README.md
```

## 📦 Installation & Setup

### Backend Setup

1. **Initialize Backend**
```bash
mkdir english-voice-platform
cd english-voice-platform
mkdir server
cd server
npm init -y
```

2. **Install Backend Dependencies**
```bash
npm install express socket.io mongoose cors dotenv
npm install @clerk/clerk-sdk-node
npm install openai assemblyai
npm install --save-dev nodemon
```

3. **Update package.json**
```json
{
  "type": "module",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js"
  }
}
```

### Frontend Setup

1. **Initialize React App**
```bash
cd ..
npm create vite@latest client -- --template react-swc
cd client
```

2. **Install Frontend Dependencies**
```bash
npm install
npm install socket.io-client
npm install @clerk/clerk-react
npm install axios
npm install react-router-dom
npm install @tailwindcss/typography
npm install lucide-react
```

3. **Setup Tailwind CSS**
```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

## 🔧 Environment Variables

### Server (.env)
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/english-voice-platform
CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
OPENAI_API_KEY=your_openai_api_key
ASSEMBLYAI_API_KEY=your_assemblyai_api_key
CLIENT_URL=http://localhost:5173
```

### Client (.env)
```
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
VITE_SERVER_URL=http://localhost:5000
```

## 🏗️ Core Implementation

### 1. Backend Server Setup

**server/src/server.js**
```javascript
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
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}));
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
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### 2. Database Models

**server/src/models/User.js**
```javascript
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  clerkId: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  username: {
    type: String,
    required: true,
    unique: true
  },
  firstName: String,
  lastName: String,
  avatar: String,
  speakingLevel: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  friendRequests: {
    sent: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    received: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

export default mongoose.model('User', userSchema);
```

**server/src/models/Call.js**
```javascript
import mongoose from 'mongoose';

const callSchema = new mongoose.Schema({
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    joinedAt: Date,
    leftAt: Date
  }],
  type: {
    type: String,
    enum: ['random', 'direct'],
    required: true
  },
  status: {
    type: String,
    enum: ['waiting', 'active', 'ended'],
    default: 'waiting'
  },
  startTime: Date,
  endTime: Date,
  duration: Number, // in seconds
  transcript: [{
    speaker: String,
    text: String,
    timestamp: Date,
    confidence: Number
  }],
  grammarFeedback: {
    originalText: String,
    correctedText: String,
    mistakes: [{
      original: String,
      corrected: String,
      explanation: String,
      position: {
        start: Number,
        end: Number
      }
    }],
    overallScore: Number,
    suggestions: [String]
  }
}, {
  timestamps: true
});

export default mongoose.model('Call', callSchema);
```

### 3. Socket Service for Real-time Communication

**server/src/services/socketService.js**
```javascript
import User from '../models/User.js';
import Call from '../models/Call.js';
import { transcribeAudio } from './transcriptionService.js';

const activeUsers = new Map(); // userId -> socketId
const waitingUsers = new Set(); // users waiting for random calls
const activeCalls = new Map(); // callId -> call data

export const handleSocketConnection = (socket, io) => {
  console.log('User connected:', socket.id);

  // User authentication and registration
  socket.on('user_online', async (data) => {
    try {
      const { userId } = data;
      activeUsers.set(userId, socket.id);
      socket.userId = userId;

      // Update user online status
      await User.findByIdAndUpdate(userId, { 
        isOnline: true,
        lastSeen: new Date()
      });

      socket.emit('user_registered', { success: true });
    } catch (error) {
      socket.emit('error', { message: 'Failed to register user' });
    }
  });

  // Join random call queue
  socket.on('join_random_queue', async () => {
    try {
      const userId = socket.userId;
      if (!userId) return;

      // Check if user is already in queue
      if (waitingUsers.has(userId)) {
        socket.emit('already_in_queue');
        return;
      }

      // If there's someone waiting, match them
      if (waitingUsers.size > 0) {
        const waitingUserId = waitingUsers.values().next().value;
        waitingUsers.delete(waitingUserId);

        // Create new call
        const newCall = new Call({
          participants: [
            { user: userId, joinedAt: new Date() },
            { user: waitingUserId, joinedAt: new Date() }
          ],
          type: 'random',
          status: 'active',
          startTime: new Date()
        });

        await newCall.save();

        // Get user details
        const [user1, user2] = await Promise.all([
          User.findById(userId),
          User.findById(waitingUserId)
        ]);

        const callData = {
          callId: newCall._id,
          participants: [
            { id: user1._id, name: user1.firstName, avatar: user1.avatar },
            { id: user2._id, name: user2.firstName, avatar: user2.avatar }
          ]
        };

        activeCalls.set(newCall._id.toString(), callData);

        // Notify both users
        const waitingSocket = activeUsers.get(waitingUserId);
        if (waitingSocket) {
          io.to(waitingSocket).emit('call_matched', callData);
        }
        socket.emit('call_matched', callData);

      } else {
        // Add to waiting queue
        waitingUsers.add(userId);
        socket.emit('waiting_for_match');
      }
    } catch (error) {
      socket.emit('error', { message: 'Failed to join random queue' });
    }
  });

  // Initiate direct call
  socket.on('initiate_direct_call', async (data) => {
    try {
      const { friendId } = data;
      const userId = socket.userId;

      // Check if friend is online
      const friendSocketId = activeUsers.get(friendId);
      if (!friendSocketId) {
        socket.emit('friend_offline');
        return;
      }

      // Create new call
      const newCall = new Call({
        participants: [
          { user: userId, joinedAt: new Date() },
          { user: friendId }
        ],
        type: 'direct',
        status: 'waiting'
      });

      await newCall.save();

      // Get user details
      const [user, friend] = await Promise.all([
        User.findById(userId),
        User.findById(friendId)
      ]);

      const callData = {
        callId: newCall._id,
        caller: { id: user._id, name: user.firstName, avatar: user.avatar },
        callee: { id: friend._id, name: friend.firstName, avatar: friend.avatar }
      };

      // Send call invitation to friend
      io.to(friendSocketId).emit('incoming_call', callData);
      socket.emit('call_initiated', callData);

    } catch (error) {
      socket.emit('error', { message: 'Failed to initiate call' });
    }
  });

  // WebRTC signaling
  socket.on('webrtc_offer', (data) => {
    const { callId, offer, targetUserId } = data;
    const targetSocketId = activeUsers.get(targetUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('webrtc_offer', {
        callId,
        offer,
        fromUserId: socket.userId
      });
    }
  });

  socket.on('webrtc_answer', (data) => {
    const { callId, answer, targetUserId } = data;
    const targetSocketId = activeUsers.get(targetUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('webrtc_answer', {
        callId,
        answer,
        fromUserId: socket.userId
      });
    }
  });

  socket.on('webrtc_ice_candidate', (data) => {
    const { callId, candidate, targetUserId } = data;
    const targetSocketId = activeUsers.get(targetUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('webrtc_ice_candidate', {
        callId,
        candidate,
        fromUserId: socket.userId
      });
    }
  });

  // Handle audio transcription
  socket.on('audio_data', async (data) => {
    try {
      const { callId, audioBlob } = data;
      // Transcribe audio using Assembly AI
      const transcript = await transcribeAudio(audioBlob);
      
      if (transcript) {
        // Save transcript to database
        await Call.findByIdAndUpdate(callId, {
          $push: {
            transcript: {
              speaker: socket.userId,
              text: transcript.text,
              timestamp: new Date(),
              confidence: transcript.confidence
            }
          }
        });

        // Broadcast transcript to all call participants
        const callData = activeCalls.get(callId);
        if (callData) {
          callData.participants.forEach(participant => {
            const socketId = activeUsers.get(participant.id);
            if (socketId) {
              io.to(socketId).emit('live_transcript', {
                speaker: socket.userId,
                text: transcript.text,
                timestamp: new Date()
              });
            }
          });
        }
      }
    } catch (error) {
      console.error('Transcription error:', error);
    }
  });

  // End call
  socket.on('end_call', async (data) => {
    try {
      const { callId } = data;
      const userId = socket.userId;

      // Update call status
      const call = await Call.findByIdAndUpdate(callId, {
        status: 'ended',
        endTime: new Date(),
        $set: {
          'participants.$[elem].leftAt': new Date()
        }
      }, {
        arrayFilters: [{ 'elem.user': userId }],
        new: true
      });

      if (call) {
        // Calculate duration
        const duration = Math.floor((call.endTime - call.startTime) / 1000);
        await Call.findByIdAndUpdate(callId, { duration });

        // Notify other participants
        const callData = activeCalls.get(callId);
        if (callData) {
          callData.participants.forEach(participant => {
            if (participant.id !== userId) {
              const socketId = activeUsers.get(participant.id);
              if (socketId) {
                io.to(socketId).emit('call_ended', { callId });
              }
            }
          });
        }

        // Remove from active calls
        activeCalls.delete(callId);

        // Generate grammar feedback
        generateGrammarFeedback(callId);
      }
    } catch (error) {
      console.error('End call error:', error);
    }
  });

  // Handle disconnect
  socket.on('disconnect', async () => {
    try {
      const userId = socket.userId;
      if (userId) {
        // Remove from active users
        activeUsers.delete(userId);
        waitingUsers.delete(userId);

        // Update user offline status
        await User.findByIdAndUpdate(userId, {
          isOnline: false,
          lastSeen: new Date()
        });
      }
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  });
};

// Generate grammar feedback using OpenAI
const generateGrammarFeedback = async (callId) => {
  // Implementation for grammar feedback generation
  // This will be implemented in the grammarService.js
};
```

### 4. Frontend Components

**client/src/main.jsx**
```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App.jsx';
import './index.css';

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={clerkPubKey}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ClerkProvider>
  </React.StrictMode>
);
```

**client/src/App.jsx**
```jsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { SignedIn, SignedOut } from '@clerk/clerk-react';
import { SocketProvider } from './context/SocketContext';

// Components
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import CallInterface from './components/call/CallInterface';
import FriendsPage from './components/friends/FriendsPage';
import HistoryPage from './components/history/HistoryPage';
import Layout from './components/Layout';

function App() {
  return (
    <div className="App">
      <SignedOut>
        <LandingPage />
      </SignedOut>
      <SignedIn>
        <SocketProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/call/:callId" element={<CallInterface />} />
              <Route path="/friends" element={<FriendsPage />} />
              <Route path="/history" element={<HistoryPage />} />
            </Routes>
          </Layout>
        </SocketProvider>
      </SignedIn>
    </div>
  );
}

export default App;
```

## 🔧 Key Services to Implement

### 1. Transcription Service (Assembly AI)
### 2. Grammar Analysis Service (OpenAI)
### 3. WebRTC Service
### 4. Socket Context for React
### 5. API Services

## 📱 UI Components Structure

### Main Components:
- **Dashboard**: Home page with random call and friends options
- **CallInterface**: Video/audio call interface with live transcription
- **FriendsPage**: Friend management (search, add, remove)
- **HistoryPage**: Call history and transcripts
- **Layout**: Navigation and common UI elements

## 🚀 Development Workflow

1. **Phase 1**: Setup authentication and basic UI
2. **Phase 2**: Implement friend management
3. **Phase 3**: Build WebRTC call functionality
4. **Phase 4**: Add transcription and grammar feedback
5. **Phase 5**: Polish UI and add advanced features

## 🧪 Testing Strategy

- Unit tests for API endpoints
- Integration tests for socket communication
- End-to-end tests for call flow
- WebRTC compatibility testing

## 📋 Deployment Checklist

- [ ] Environment variables configured
- [ ] MongoDB Atlas setup
- [ ] Clerk authentication configured
- [ ] Assembly AI API setup
- [ ] OpenAI API setup
- [ ] WebRTC STUN/TURN servers configured
- [ ] Frontend build optimization
- [ ] Backend security middleware
- [ ] SSL certificates for HTTPS
- [ ] Domain configuration

This guide provides the foundation for building your English Communication Voice Platform. Each component can be expanded with additional features and optimizations based on your specific requirements.