import express from 'express';
import { clerkClient } from '@clerk/clerk-sdk-node';
import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';

const auth = ClerkExpressRequireAuth();
import Call from '../models/Call.js';

const router = express.Router();

// Get user's call history
router.get('/history', auth, async (req, res) => {
  try {
    const userId = req.auth.userId;
    
    const calls = await Call.find({
      'participants.user': userId,
      status: 'ended'
    })
    .populate('participants.user', 'firstName lastName avatar')
    .sort({ startTime: -1 })
    .lean();

    res.json({ calls });
  } catch (error) {
    console.error('Error fetching call history:', error);
    res.status(500).json({ error: 'Failed to fetch call history' });
  }
});

// Get specific call details
router.get('/:callId', auth, async (req, res) => {
  try {
    const { callId } = req.params;
    const userId = req.auth.userId;

    const call = await Call.findOne({
      _id: callId,
      'participants.user': userId
    })
    .populate('participants.user', 'firstName lastName avatar')
    .lean();

    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    res.json({ call });
  } catch (error) {
    console.error('Error fetching call details:', error);
    res.status(500).json({ error: 'Failed to fetch call details' });
  }
});

// Update call feedback
router.patch('/:callId/feedback', auth, async (req, res) => {
  try {
    const { callId } = req.params;
    const userId = req.auth.userId;
    const { rating, comment } = req.body;

    const call = await Call.findOne({
      _id: callId,
      'participants.user': userId,
      status: 'ended'
    });

    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    // Find the participant and update their feedback
    const participant = call.participants.find(p => p.user.toString() === userId);
    if (participant) {
      participant.feedback = {
        rating,
        comment,
        timestamp: new Date()
      };
      await call.save();
    }

    res.json({ message: 'Feedback updated successfully' });
  } catch (error) {
    console.error('Error updating call feedback:', error);
    res.status(500).json({ error: 'Failed to update feedback' });
  }
});

// Delete call history (soft delete)
router.delete('/:callId', auth, async (req, res) => {
  try {
    const { callId } = req.params;
    const userId = req.auth.userId;

    const call = await Call.findOne({
      _id: callId,
      'participants.user': userId,
      status: 'ended'
    });

    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    // Soft delete by marking the call as hidden for this user
    const participant = call.participants.find(p => p.user.toString() === userId);
    if (participant) {
      participant.hidden = true;
      await call.save();
    }

    res.json({ message: 'Call history deleted successfully' });
  } catch (error) {
    console.error('Error deleting call history:', error);
    res.status(500).json({ error: 'Failed to delete call history' });
  }
});

export default router;