import express from 'express';
import { clerkClient } from '@clerk/clerk-sdk-node';
import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';

const auth = ClerkExpressRequireAuth();
import User from '../models/User.js';

const router = express.Router();

// Webhook handler for Clerk user events
router.post('/webhook', async (req, res) => {
  const { type, data } = req.body;

  try {
    switch (type) {
      case 'user.created': {
        const { id, email_addresses, username, first_name, last_name } = data;
        
        const user = new User({
          clerkId: id,
          email: email_addresses[0]?.email_address,
          username: username || email_addresses[0]?.email_address.split('@')[0],
          firstName: first_name,
          lastName: last_name,
          speakingLevel: 'beginner',
          onlineStatus: 'offline',
          lastSeen: new Date()
        });

        await user.save();
        break;
      }

      case 'user.updated': {
        const { id, email_addresses, username, first_name, last_name } = data;
        
        await User.findOneAndUpdate(
          { clerkId: id },
          {
            email: email_addresses[0]?.email_address,
            username: username || email_addresses[0]?.email_address.split('@')[0],
            firstName: first_name,
            lastName: last_name
          }
        );
        break;
      }

      case 'user.deleted': {
        const { id } = data;
        await User.findOneAndDelete({ clerkId: id });
        break;
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

// Get current user
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
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

export default router;