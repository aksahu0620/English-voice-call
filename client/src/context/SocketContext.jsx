import React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export function useSocket() {
  return useContext(SocketContext);
}

export function SocketProvider({ children }) {
  const { user } = useUser();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);

  useEffect(() => {
    if (!user) {
      console.log('No user, skipping socket connection');
      return;
    }

    const serverUrl = import.meta.env.VITE_SERVER_URL;
    console.log('Attempting to connect to:', serverUrl);
    console.log('User ID:', user.id);

    // Initialize socket connection
    const socketInstance = io(serverUrl, {
      auth: {
        token: user.id
      },
      transports: ['polling'],
      timeout: 10000,
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });

    // Socket event handlers
    socketInstance.on('connect', () => {
      console.log('✅ Socket connected successfully', socketInstance.id);
      setIsConnected(true);
      setConnectionError(null);
      
      // Register user
      socketInstance.emit('user_online', { userId: user.id });
      
      // Start keep-alive ping
      const pingInterval = setInterval(() => {
        if (socketInstance.connected) {
          socketInstance.emit('ping');
        }
      }, 30000); // Ping every 30 seconds
      
      socketInstance.on('disconnect', () => {
        clearInterval(pingInterval);
      });
    });

    socketInstance.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
      setConnectionError(error.message);
      setIsConnected(false);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      setIsConnected(false);
    });

    socketInstance.on('error', (error) => {
      console.error('❌ Socket error:', error);
      setConnectionError(error.message);
    });

    socketInstance.on('reconnect', (attemptNumber) => {
      console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
      setIsConnected(true);
      setConnectionError(null);
    });

    socketInstance.on('reconnect_error', (error) => {
      console.error('❌ Socket reconnection error:', error);
      setConnectionError(error.message);
    });

    socketInstance.on('connection_confirmed', (data) => {
      console.log('✅ Connection confirmed by server:', data);
    });

    socketInstance.on('pong', (data) => {
      console.log('🏓 Pong received:', data);
    });

    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up socket connection');
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, [user]);

  // Socket context value
  const value = {
    socket,
    isConnected,
    connectionError,
    // Helper functions for common socket operations
    joinRandomQueue: () => {
      if (socket && isConnected) {
        console.log('🎯 Emitting join_random_queue');
        socket.emit('join_random_queue');
      } else {
        console.log('❌ Socket not ready', { 
          socket: !!socket, 
          isConnected, 
          connectionError 
        });
      }
    },
    initiateDirectCall: (friendId) => {
      if (socket && isConnected) {
        socket.emit('initiate_direct_call', { friendId });
      }
    },
    endCall: (callId) => {
      if (socket && isConnected) {
        socket.emit('end_call', { callId });
      }
    },
    sendWebRTCOffer: (callId, offer, targetUserId) => {
      if (socket && isConnected) {
        socket.emit('webrtc_offer', { callId, offer, targetUserId });
      }
    },
    sendWebRTCAnswer: (callId, answer, targetUserId) => {
      if (socket && isConnected) {
        socket.emit('webrtc_answer', { callId, answer, targetUserId });
      }
    },
    sendICECandidate: (callId, candidate, targetUserId) => {
      if (socket && isConnected) {
        socket.emit('webrtc_ice_candidate', { callId, candidate, targetUserId });
      }
    },
    sendAudioData: (callId, audioBlob) => {
      if (socket && isConnected) {
        socket.emit('audio_data', { callId, audioBlob });
      }
    }
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}