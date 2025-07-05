import express from 'express';
import { clerkClient } from '@clerk/clerk-sdk-node';
import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';

const auth = ClerkExpressRequireAuth();
import User from '../models/User.js';
import Call from '../models/Call.js';

const router = express.Router();

// Get current user's profile
router.get('/me', auth, async (req, res) => {
  try {
    const userId = req.auth.userId;

    const user = await User.findOne({ clerkId: userId })
      .select('-sentFriendRequests -receivedFriendRequests')
      .populate('friends', 'firstName lastName username avatar speakingLevel onlineStatus lastSeen')
      .lean();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Update user profile
router.patch('/me', auth, async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { username, speakingLevel, bio } = req.body;

    const user = await User.findOne({ clerkId: userId });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Validate username uniqueness if changed
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ error: 'Username already taken' });
      }
      user.username = username;
    }

    // Update speaking level if provided
    if (speakingLevel) {
      const validLevels = ['beginner', 'intermediate', 'advanced', 'native'];
      if (!validLevels.includes(speakingLevel)) {
        return res.status(400).json({ error: 'Invalid speaking level' });
      }
      user.speakingLevel = speakingLevel;
    }

    // Update bio if provided
    if (bio !== undefined) {
      user.bio = bio;
    }

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        username: user.username,
        speakingLevel: user.speakingLevel,
        bio: user.bio
      }
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get user's statistics
router.get('/me/stats', auth, async (req, res) => {
  try {
    const userId = req.auth.userId;

    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Aggregate call statistics
    const callStats = await Call.aggregate([
      {
        $match: {
          'participants.user': user._id,
          status: 'ended'
        }
      },
      {
        $group: {
          _id: null,
          totalCalls: { $sum: 1 },
          totalDuration: { $sum: '$duration' },
          averageScore: { $avg: '$grammarFeedback.overallScore' }
        }
      }
    ]);

    // Get recent activity
    const recentCalls = await Call.find({
      'participants.user': user._id,
      status: 'ended'
    })
    .sort({ endTime: -1 })
    .limit(5)
    .populate('participants.user', 'firstName lastName avatar')
    .lean();

    const stats = {
      totalCalls: callStats[0]?.totalCalls || 0,
      totalMinutes: Math.round((callStats[0]?.totalDuration || 0) / 60),
      averageScore: Math.round(callStats[0]?.averageScore || 0),
      friendCount: user.friends.length,
      recentCalls: recentCalls.map(call => ({
        id: call._id,
        type: call.type,
        duration: call.duration,
        date: call.endTime,
        partner: call.participants.find(p => !p.user._id.equals(user._id))?.user
      }))
    };

    res.json({ stats });
  } catch (error) {
    console.error('Error fetching user statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Get user's preferences
router.get('/me/preferences', auth, async (req, res) => {
  try {
    const userId = req.auth.userId;

    const user = await User.findOne({ clerkId: userId })
      .select('preferences')
      .lean();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ preferences: user.preferences });
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

// Update user's preferences
router.patch('/me/preferences', auth, async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { preferences } = req.body;

    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update only provided preferences
    user.preferences = {
      ...user.preferences,
      ...preferences
    };

    await user.save();

    res.json({
      message: 'Preferences updated successfully',
      preferences: user.preferences
    });
  } catch (error) {
    console.error('Error updating user preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

export default router;