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
  }

  async initialize(isInitiator = false) {
    this.isInitiator = isInitiator;
    this.peerConnection = new RTCPeerConnection(configuration);

    // Set up event handlers
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('webrtc_ice_candidate', {
          callId: this.callId,
          candidate: event.candidate,
          targetUserId: this.targetUserId
        });
      }
    };

    this.peerConnection.ontrack = (event) => {
      this.remoteStream = event.streams[0];
      // Trigger remote stream handler if provided
      if (this.onRemoteStream) {
        this.onRemoteStream(this.remoteStream);
      }
    };

    // Get local stream
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
      });

      // Add tracks to peer connection
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });

      // Trigger local stream handler if provided
      if (this.onLocalStream) {
        this.onLocalStream(this.localStream);
      }

      // If initiator, create and send offer
      if (isInitiator) {
        await this.createAndSendOffer();
      }
    } catch (error) {
      console.error('Error getting user media:', error);
      throw error;
    }
  }

  async createAndSendOffer() {
    try {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      this.socket.emit('webrtc_offer', {
        callId: this.callId,
        offer: offer,
        targetUserId: this.targetUserId
      });
    } catch (error) {
      console.error('Error creating offer:', error);
      throw error;
    }
  }

  async handleOffer(offer) {
    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      this.socket.emit('webrtc_answer', {
        callId: this.callId,
        answer: answer,
        targetUserId: this.targetUserId
      });
    } catch (error) {
      console.error('Error handling offer:', error);
      throw error;
    }
  }

  async handleAnswer(answer) {
    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (error) {
      console.error('Error handling answer:', error);
      throw error;
    }
  }

  async handleIceCandidate(candidate) {
    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
      throw error;
    }
  }

  // Clean up resources
  cleanup() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
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
    if (!this.remoteStream) return;

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