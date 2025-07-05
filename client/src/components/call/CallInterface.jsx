import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import { WebRTCConnection } from '../../services/webRTCService';
import { useUser } from '@clerk/clerk-react';

function CallInterface() {
  const { callId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const initialCallData = location.state;
  const { socket, isConnected } = useSocket();
  const { user } = useUser();
  
  const [callStatus, setCallStatus] = useState('connecting'); // connecting, active, ended
  const [participants, setParticipants] = useState([]);
  const [transcripts, setTranscripts] = useState([]);
  const [connectionState, setConnectionState] = useState('new');
  const [iceConnectionState, setIceConnectionState] = useState('new');
  const webrtcRef = useRef(null);
  const localAudioRef = useRef(null);
  const remoteAudioRef = useRef(null);

  useEffect(() => {
    if (!isConnected || !socket) return;

    // Socket event listeners
    const handleCallMatched = (data) => {
      console.log('📞 Received call_matched event:', data);
      setParticipants(data.participants);
      initializeWebRTC(data);
      setCallStatus('active');
    };

    const handleWebRTCOffer = async (data) => {
      console.log('📥 Received WebRTC offer:', data);
      if (!webrtcRef.current) {
        console.error('❌ WebRTC not initialized when offer received');
        return;
      }
      try {
        await webrtcRef.current.handleOffer(data.offer);
      } catch (error) {
        console.error('❌ Error handling offer:', error);
      }
    };

    const handleWebRTCAnswer = async (data) => {
      console.log('📥 Received WebRTC answer:', data);
      if (!webrtcRef.current) {
        console.error('❌ WebRTC not initialized when answer received');
        return;
      }
      try {
        await webrtcRef.current.handleAnswer(data.answer);
      } catch (error) {
        console.error('❌ Error handling answer:', error);
      }
    };

    const handleICECandidate = async (data) => {
      console.log('🧊 Received ICE candidate:', data);
      if (!webrtcRef.current) {
        console.error('❌ WebRTC not initialized when ICE candidate received');
        return;
      }
      try {
        await webrtcRef.current.handleIceCandidate(data.candidate);
      } catch (error) {
        console.error('❌ Error handling ICE candidate:', error);
      }
    };

    const handleLiveTranscript = (data) => {
      setTranscripts(prev => [...prev, {
        speaker: data.speaker,
        text: data.text,
        timestamp: new Date(data.timestamp)
      }]);
    };

    const handleCallEnded = () => {
      setCallStatus('ended');
      cleanup();
      navigate('/history');
    };

    // Register event listeners
    socket.on('call_matched', handleCallMatched);
    socket.on('webrtc_offer', handleWebRTCOffer);
    socket.on('webrtc_answer', handleWebRTCAnswer);
    socket.on('webrtc_ice_candidate', handleICECandidate);
    socket.on('live_transcript', handleLiveTranscript);
    socket.on('call_ended', handleCallEnded);

    // If we have call data from navigation, initialize immediately
    if (initialCallData) {
      handleCallMatched(initialCallData);
    }

    // Cleanup function
    return () => {
      socket.off('call_matched', handleCallMatched);
      socket.off('webrtc_offer', handleWebRTCOffer);
      socket.off('webrtc_answer', handleWebRTCAnswer);
      socket.off('webrtc_ice_candidate', handleICECandidate);
      socket.off('live_transcript', handleLiveTranscript);
      socket.off('call_ended', handleCallEnded);
      cleanup();
    };
  }, [socket, isConnected, callId, navigate, initialCallData]);

  const initializeWebRTC = async (callData) => {
    console.log('🔧 initializeWebRTC called with:', callData);
    if (!user) {
      console.error('❌ No user available for WebRTC initialization');
      return;
    }

    // Find the current user in participants
    const currentParticipant = callData.participants.find(p => p.id === user.id);
    const otherParticipant = callData.participants.find(p => p.id !== user.id);

    if (!currentParticipant || !otherParticipant) {
      console.error('❌ Could not find participants:', { 
        currentUser: user.id, 
        participants: callData.participants.map(p => p.id) 
      });
      return;
    }

    // Determine initiator (first participant is initiator)
    const isInitiator = callData.participants[0].id === user.id;
    const targetUserId = otherParticipant.id;

    console.log('🎯 WebRTC setup:', { 
      isInitiator, 
      targetUserId, 
      currentUser: user.id,
      participants: callData.participants.map(p => ({ id: p.id, name: p.name }))
    });

    const webrtc = new WebRTCConnection(socket, callId, targetUserId);
    
    // Set up stream handlers
    webrtc.onLocalStream = (stream) => {
      console.log('🎤 Local stream received:', stream);
      if (localAudioRef.current) {
        localAudioRef.current.srcObject = stream;
        console.log('✅ Local audio element updated');
      } else {
        console.error('❌ Local audio ref not available');
      }
    };

    webrtc.onRemoteStream = (stream) => {
      console.log('🎵 Remote stream received:', stream);
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = stream;
        console.log('✅ Remote audio element updated');
        // Ensure audio is not muted
        remoteAudioRef.current.muted = false;
        remoteAudioRef.current.volume = 1.0;
      } else {
        console.error('❌ Remote audio ref not available');
      }
      webrtc.setupAudioProcessing();
    };

    webrtc.onConnectionStateChange = (state) => {
      console.log('🔗 Connection state changed:', state);
      setConnectionState(state);
    };

    webrtc.onIceConnectionStateChange = (state) => {
      console.log('🧊 ICE connection state changed:', state);
      setIceConnectionState(state);
    };

    try {
      await webrtc.initialize(isInitiator);
      webrtcRef.current = webrtc;
      console.log('✅ WebRTC initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize WebRTC:', error);
    }
  };

  const cleanup = () => {
    if (webrtcRef.current) {
      webrtcRef.current.cleanup();
      webrtcRef.current = null;
    }
  };

  const handleEndCall = () => {
    if (socket && isConnected) {
      socket.emit('end_call', { callId });
      cleanup();
      navigate('/history');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6">
        {/* Call Status */}
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-semibold text-gray-800">
            {callStatus === 'connecting' ? 'Connecting...' :
             callStatus === 'active' ? 'Call in Progress' :
             'Call Ended'}
          </h2>
          
          {/* Connection Status */}
          <div className="mt-4 space-y-2">
            <div className="text-sm">
              <span className="font-medium">Connection State:</span>
              <span className={`ml-2 px-2 py-1 rounded text-xs ${
                connectionState === 'connected' ? 'bg-green-100 text-green-800' :
                connectionState === 'connecting' ? 'bg-yellow-100 text-yellow-800' :
                connectionState === 'failed' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {connectionState}
              </span>
            </div>
            <div className="text-sm">
              <span className="font-medium">ICE State:</span>
              <span className={`ml-2 px-2 py-1 rounded text-xs ${
                iceConnectionState === 'connected' ? 'bg-green-100 text-green-800' :
                iceConnectionState === 'checking' ? 'bg-yellow-100 text-yellow-800' :
                iceConnectionState === 'failed' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {iceConnectionState}
              </span>
            </div>
          </div>
        </div>

        {/* Participants */}
        <div className="mb-8">
          <div className="flex justify-center space-x-8">
            {participants.map((participant) => (
              <div key={participant.id} className="text-center">
                <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center mb-2">
                  {participant.avatar ? (
                    <img
                      src={participant.avatar}
                      alt={participant.name}
                      className="w-full h-full rounded-full"
                    />
                  ) : (
                    <span className="text-2xl text-primary-600">
                      {participant.name[0]}
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium text-gray-700">
                  {participant.name}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Audio Elements */}
        <audio ref={localAudioRef} autoPlay muted />
        <audio ref={remoteAudioRef} autoPlay />
        
        {/* Audio Debug Controls */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-medium text-gray-800 mb-3">Audio Debug</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Local Audio</label>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    if (localAudioRef.current) {
                      localAudioRef.current.muted = !localAudioRef.current.muted;
                      console.log('Local audio muted:', localAudioRef.current.muted);
                    }
                  }}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                >
                  Toggle Mute
                </button>
                <div className="text-xs text-gray-600">
                  Muted: {localAudioRef.current?.muted ? 'Yes' : 'No'}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Remote Audio</label>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    if (remoteAudioRef.current) {
                      remoteAudioRef.current.muted = !remoteAudioRef.current.muted;
                      console.log('Remote audio muted:', remoteAudioRef.current.muted);
                    }
                  }}
                  className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
                >
                  Toggle Mute
                </button>
                <div className="text-xs text-gray-600">
                  Muted: {remoteAudioRef.current?.muted ? 'Yes' : 'No'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Transcription */}
        <div className="mb-8">
          <h3 className="text-lg font-medium text-gray-800 mb-4">
            Live Transcription
          </h3>
          <div className="bg-gray-50 rounded-lg p-4 h-64 overflow-y-auto">
            {transcripts.map((transcript, index) => (
              <div key={index} className="mb-3">
                <span className="font-medium text-primary-600">
                  {participants.find(p => p.id === transcript.speaker)?.name}:
                </span>
                <span className="ml-2 text-gray-700">{transcript.text}</span>
                <span className="text-xs text-gray-400 ml-2">
                  {transcript.timestamp.toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Call Controls */}
        <div className="flex justify-center">
          <button
            onClick={handleEndCall}
            className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg"
          >
            End Call
          </button>
        </div>
      </div>
    </div>
  );
}

export default CallInterface;