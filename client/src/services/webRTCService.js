// WebRTC configuration
const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ]
};

export class WebRTCConnection {
  constructor(socket, callId, targetUserId) {
    this.socket = socket;
    this.callId = callId;
    this.targetUserId = targetUserId;
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.isInitiator = false;
    this.onLocalStream = null;
    this.onRemoteStream = null;
    this.onConnectionStateChange = null;
    this.onIceConnectionStateChange = null;
  }

  async initialize(isInitiator = false) {
    this.isInitiator = isInitiator;
    console.log('🔧 Initializing WebRTC connection:', { isInitiator, callId: this.callId, targetUserId: this.targetUserId });
    
    this.peerConnection = new RTCPeerConnection(configuration);

    // Set up event handlers
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('🧊 ICE candidate generated:', event.candidate);
        this.socket.emit('webrtc_ice_candidate', {
          callId: this.callId,
          candidate: event.candidate,
          targetUserId: this.targetUserId
        });
      }
    };

    this.peerConnection.ontrack = (event) => {
      console.log('🎵 Remote track received:', event.streams[0]);
      this.remoteStream = event.streams[0];
      // Trigger remote stream handler if provided
      if (this.onRemoteStream) {
        this.onRemoteStream(this.remoteStream);
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      console.log('🔗 Connection state changed:', this.peerConnection.connectionState);
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(this.peerConnection.connectionState);
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      console.log('🧊 ICE connection state changed:', this.peerConnection.iceConnectionState);
      if (this.onIceConnectionStateChange) {
        this.onIceConnectionStateChange(this.peerConnection.iceConnectionState);
      }
    };

    // Get local stream
    try {
      console.log('🎤 Requesting microphone access...');
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });

      console.log('✅ Microphone access granted, tracks:', this.localStream.getTracks().map(t => t.kind));

      // Add tracks to peer connection
      this.localStream.getTracks().forEach(track => {
        console.log('➕ Adding track to peer connection:', track.kind);
        this.peerConnection.addTrack(track, this.localStream);
      });

      // Trigger local stream handler if provided
      if (this.onLocalStream) {
        this.onLocalStream(this.localStream);
      }

      // If initiator, create and send offer
      if (isInitiator) {
        console.log('🎯 Creating and sending offer...');
        await this.createAndSendOffer();
      }
    } catch (error) {
      console.error('❌ Error getting user media:', error);
      throw error;
    }
  }

  async createAndSendOffer() {
    try {
      console.log('📤 Creating offer...');
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      console.log('📤 Offer created and set as local description');

      this.socket.emit('webrtc_offer', {
        callId: this.callId,
        offer: offer,
        targetUserId: this.targetUserId
      });
      console.log('📤 Offer sent to peer');
    } catch (error) {
      console.error('❌ Error creating offer:', error);
      throw error;
    }
  }

  async handleOffer(offer) {
    try {
      console.log('📥 Received offer, setting remote description...');
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      console.log('📥 Remote description set, creating answer...');
      
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      console.log('📤 Answer created and set as local description');

      this.socket.emit('webrtc_answer', {
        callId: this.callId,
        answer: answer,
        targetUserId: this.targetUserId
      });
      console.log('📤 Answer sent to peer');
    } catch (error) {
      console.error('❌ Error handling offer:', error);
      throw error;
    }
  }

  async handleAnswer(answer) {
    try {
      console.log('📥 Received answer, setting remote description...');
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      console.log('✅ Remote description set from answer');
    } catch (error) {
      console.error('❌ Error handling answer:', error);
      throw error;
    }
  }

  async handleIceCandidate(candidate) {
    try {
      console.log('🧊 Adding ICE candidate:', candidate);
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      console.log('✅ ICE candidate added successfully');
    } catch (error) {
      console.error('❌ Error handling ICE candidate:', error);
      throw error;
    }
  }

  // Get connection state
  getConnectionState() {
    return this.peerConnection ? this.peerConnection.connectionState : 'new';
  }

  getIceConnectionState() {
    return this.peerConnection ? this.peerConnection.iceConnectionState : 'new';
  }

  // Clean up resources
  cleanup() {
    console.log('🧹 Cleaning up WebRTC connection');
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        console.log('🛑 Stopping track:', track.kind);
        track.stop();
      });
    }
    if (this.peerConnection) {
      this.peerConnection.close();
    }
    this.localStream = null;
    this.remoteStream = null;
    this.peerConnection = null;
  }

  // Audio processing for transcription
  setupAudioProcessing() {
    if (!this.remoteStream) {
      console.log('⚠️ No remote stream available for audio processing');
      return;
    }

    console.log('🎵 Setting up audio processing for transcription');
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(this.remoteStream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);

    source.connect(processor);
    processor.connect(audioContext.destination);

    const chunks = [];

    processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      chunks.push(new Float32Array(inputData));

      // Send chunks for transcription every 5 seconds
      if (chunks.length >= 120) { // ~5 seconds at 48kHz
        const audioBlob = new Blob(chunks, { type: 'audio/wav' });
        this.socket.emit('audio_data', {
          callId: this.callId,
          audioBlob: audioBlob
        });
        chunks.length = 0; // Clear the chunks array
      }
    };

    this.cleanup = () => {
      console.log('🧹 Cleaning up audio processing');
      processor.disconnect();
      source.disconnect();
      audioContext.close();
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
      }
      if (this.peerConnection) {
        this.peerConnection.close();
      }
    };
  }
}