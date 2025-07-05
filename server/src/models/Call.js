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