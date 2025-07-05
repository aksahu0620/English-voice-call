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
  const webrtcRef = useRef(null);
  const localAudioRef = useRef(null);
  const remoteAudioRef = useRef(null);

  useEffect(() => {
    if (!isConnected || !socket) return;

    // Socket event listeners
    const handleCallMatched = (data) => {
      console.log('Received call_matched event:', data);
      setParticipants(data.participants);
      initializeWebRTC(data);
      setCallStatus('active');
    };

    const handleWebRTCOffer = async (data) => {
      if (!webrtcRef.current) return;
      await webrtcRef.current.handleOffer(data.offer);
    };

    const handleWebRTCAnswer = async (data) => {
      if (!webrtcRef.current) return;
      await webrtcRef.current.handleAnswer(data.answer);
    };

    const handleICECandidate = async (data) => {
      if (!webrtcRef.current) return;
      await webrtcRef.current.handleIceCandidate(data.candidate);
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
    console.log('initializeWebRTC called with:', callData);
    if (!user) return;
    // Determine initiator and targetUserId based on Clerk user.id
    let isInitiator = false;
    let targetUserId = null;
    if (callData.participants[0].id === user.id) {
      isInitiator = true;
      targetUserId = callData.participants[1].id;
    } else {
      isInitiator = false;
      targetUserId = callData.participants[0].id;
    }
    const webrtc = new WebRTCConnection(socket, callId, targetUserId);
    // Set up stream handlers
    webrtc.onLocalStream = (stream) => {
      if (localAudioRef.current) {
        localAudioRef.current.srcObject = stream;
      }
    };
    webrtc.onRemoteStream = (stream) => {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = stream;
      }
      webrtc.setupAudioProcessing();
    };
    await webrtc.initialize(isInitiator);
    webrtcRef.current = webrtc;
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