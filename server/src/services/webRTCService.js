import WebSocket from 'ws';

// Store active WebRTC connections
const rtcConnections = new Map();

export const handleWebRTCSignaling = (ws) => {
  console.log('WebRTC client connected');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      const { type, payload } = data;

      switch (type) {
        case 'join': {
          const { callId, userId } = payload;
          // Store connection info
          if (!rtcConnections.has(callId)) {
            rtcConnections.set(callId, new Map());
          }
          rtcConnections.get(callId).set(userId, ws);
          break;
        }

        case 'offer':
        case 'answer':
        case 'ice-candidate': {
          const { callId, targetUserId } = payload;
          const callConnections = rtcConnections.get(callId);
          
          if (callConnections) {
            const targetWs = callConnections.get(targetUserId);
            if (targetWs && targetWs.readyState === WebSocket.OPEN) {
              targetWs.send(JSON.stringify(data));
            }
          }
          break;
        }

        case 'leave': {
          const { callId, userId } = payload;
          handlePeerDisconnect(callId, userId);
          break;
        }
      }
    } catch (error) {
      console.error('WebRTC signaling error:', error);
    }
  });

  ws.on('close', () => {
    // Clean up connections when WebSocket closes
    for (const [callId, connections] of rtcConnections.entries()) {
      for (const [userId, socket] of connections.entries()) {
        if (socket === ws) {
          handlePeerDisconnect(callId, userId);
          break;
        }
      }
    }
  });
};

function handlePeerDisconnect(callId, userId) {
  const callConnections = rtcConnections.get(callId);
  if (callConnections) {
    // Remove the disconnected peer
    callConnections.delete(userId);

    // Notify remaining peers about the disconnection
    for (const [peerId, ws] of callConnections.entries()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'peer-disconnected',
          payload: { callId, userId }
        }));
      }
    }

    // Clean up call if no peers remain
    if (callConnections.size === 0) {
      rtcConnections.delete(callId);
    }
  }
}