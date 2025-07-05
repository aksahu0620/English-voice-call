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
      console.log('user_online event:', userId);
      activeUsers.set(userId, socket.id);
      socket.userId = userId;

      // Update user online status and get MongoDB user
      const user = await User.findOneAndUpdate(
        { clerkId: userId },
        { isOnline: true, lastSeen: new Date() },
        { new: true }
      );

      // Join room named after MongoDB _id
      if (user && user._id) {
        socket.join(user._id.toString());
        console.log(`Socket ${socket.id} joined room ${user._id}`);
        socket.mongoUserId = user._id.toString();
      }

      socket.emit('user_registered', { success: true });
    } catch (error) {
      console.error('user_online error:', error);
      socket.emit('error', { message: 'Failed to register user' });
    }
  });

  // Join random call queue
  socket.on('join_random_queue', async () => {
    try {
      const userId = socket.userId;
      console.log('join_random_queue event for userId:', userId);
      console.log('Current waitingUsers before:', Array.from(waitingUsers));
      if (!userId) {
        console.error('join_random_queue: socket.userId is undefined!');
        return;
      }
      if (waitingUsers.has(userId)) {
        console.log('User already in queue:', userId);
        socket.emit('already_in_queue');
        return;
      }
      if (waitingUsers.size > 0) {
        const waitingUserId = waitingUsers.values().next().value;
        waitingUsers.delete(waitingUserId);
        console.log('Matching', userId, 'with', waitingUserId);

        // Get user details by clerkId
        const [user1, user2] = await Promise.all([
          User.findOne({ clerkId: userId }),
          User.findOne({ clerkId: waitingUserId })
        ]);

        // Create new call with MongoDB ObjectIds
        const newCall = new Call({
          participants: [
            { user: user1._id, joinedAt: new Date() },
            { user: user2._id, joinedAt: new Date() }
          ],
          type: 'random',
          status: 'active',
          startTime: new Date()
        });

        await newCall.save();

        // Get user details
        const callData = {
          callId: newCall._id,
          participants: [
            {
              id: user1._id.toString(),
              name: user1.firstName || user1.username || user1.email || 'Unknown',
              avatar: user1.avatar
            },
            {
              id: user2._id.toString(),
              name: user2.firstName || user2.username || user2.email || 'Unknown',
              avatar: user2.avatar
            }
          ]
        };

        activeCalls.set(newCall._id.toString(), callData);

        // Notify both users
        const waitingSocket = activeUsers.get(waitingUserId);
        if (waitingSocket) {
          console.log('Emitting call_matched to', user2._id, 'with data:', callData);
          io.to(waitingSocket).emit('call_matched', callData);
        }
        console.log('Emitting call_matched to', user1._id, 'with data:', callData);
        socket.emit('call_matched', callData);
      } else {
        waitingUsers.add(userId);
        console.log('Added user to waitingUsers:', userId);
        socket.emit('waiting_for_match');
      }
      console.log('Current waitingUsers after:', Array.from(waitingUsers));
    } catch (error) {
      console.error('join_random_queue error:', error);
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
        User.findOne({ clerkId: userId }),
        User.findOne({ clerkId: friendId })
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
        await generateGrammarFeedback(callId);
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
        await User.findOneAndUpdate(
          { clerkId: userId },
          { isOnline: false, lastSeen: new Date() }
        );
      }
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  });
};

// Generate grammar feedback using OpenAI
async function generateGrammarFeedback(callId) {
  try {
    const call = await Call.findById(callId);
    if (!call || !call.transcript.length) return;

    // Combine all transcripts
    const fullText = call.transcript
      .map(t => t.text)
      .join(' ');

    // TODO: Implement OpenAI grammar analysis
    // This will be implemented in a separate service

  } catch (error) {
    console.error('Grammar feedback error:', error);
  }
}