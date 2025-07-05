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

  useEffect(() => {
    if (!user) return;

    // Initialize socket connection
    const socketInstance = io(import.meta.env.VITE_SERVER_URL, {
      auth: {
        token: user.id
      }
    });

    // Socket event handlers
    socketInstance.on('connect', () => {
      console.log('Socket connected', socketInstance.id);
      setIsConnected(true);
      
      // Register user
      socketInstance.emit('user_online', { userId: user.id });
    });

    socketInstance.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    socketInstance.on('error', (error) => {
      console.error('Socket error:', error);
    });

    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, [user]);

  // Socket context value
  const value = {
    socket,
    isConnected,
    // Helper functions for common socket operations
    joinRandomQueue: () => {
      if (socket && isConnected) {
        console.log('Emitting join_random_queue');
        socket.emit('join_random_queue');
      } else {
        console.log('Socket not ready', { socket, isConnected });
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