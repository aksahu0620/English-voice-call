import express from 'express';
import { clerkClient } from '@clerk/clerk-sdk-node';
import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';

const auth = ClerkExpressRequireAuth();
import User from '../models/User.js';

const router = express.Router();

// Search users
router.get('/search', auth, async (req, res) => {
  try {
    const { query } = req.query;
    const userId = req.auth.userId;

    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const users = await User.find({
      $and: [
        { clerkId: { $ne: userId } },
        {
          $or: [
            { firstName: { $regex: query, $options: 'i' } },
            { lastName: { $regex: query, $options: 'i' } },
            { email: { $regex: query, $options: 'i' } },
            { username: { $regex: query, $options: 'i' } }
          ]
        }
      ]
    })
    .select('clerkId firstName lastName username avatar speakingLevel')
    .limit(10)
    .lean();

    res.json({ users });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

// Send friend request
router.post('/requests/send/:userId', auth, async (req, res) => {
  try {
    const senderId = req.auth.userId;
    const receiverId = req.params.userId;

    if (senderId === receiverId) {
      return res.status(400).json({ error: 'Cannot send friend request to yourself' });
    }

    const [sender, receiver] = await Promise.all([
      User.findOne({ clerkId: senderId }),
      User.findOne({ clerkId: receiverId })
    ]);

    if (!receiver) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if they are already friends
    if (sender.friends.includes(receiver._id)) {
      return res.status(400).json({ error: 'Already friends with this user' });
    }

    // Check if request already sent
    if (sender.sentFriendRequests.includes(receiver._id) ||
        receiver.receivedFriendRequests.includes(sender._id)) {
      return res.status(400).json({ error: 'Friend request already sent' });
    }

    // Add to sent/received requests
    sender.sentFriendRequests.push(receiver._id);
    receiver.receivedFriendRequests.push(sender._id);

    await Promise.all([
      sender.save(),
      receiver.save()
    ]);

    res.json({ message: 'Friend request sent successfully' });
  } catch (error) {
    console.error('Error sending friend request:', error);
    res.status(500).json({ error: 'Failed to send friend request' });
  }
});

// Accept friend request
router.post('/requests/accept/:userId', auth, async (req, res) => {
  try {
    const receiverId = req.auth.userId;
    const senderId = req.params.userId;

    const [receiver, sender] = await Promise.all([
      User.findOne({ clerkId: receiverId }),
      User.findOne({ clerkId: senderId })
    ]);

    if (!sender) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify request exists
    if (!receiver.receivedFriendRequests.includes(sender._id) ||
        !sender.sentFriendRequests.includes(receiver._id)) {
      return res.status(400).json({ error: 'No friend request found' });
    }

    // Remove from requests and add to friends
    receiver.receivedFriendRequests = receiver.receivedFriendRequests
      .filter(id => !id.equals(sender._id));
    sender.sentFriendRequests = sender.sentFriendRequests
      .filter(id => !id.equals(receiver._id));

    receiver.friends.push(sender._id);
    sender.friends.push(receiver._id);

    await Promise.all([
      receiver.save(),
      sender.save()
    ]);

    res.json({ message: 'Friend request accepted' });
  } catch (error) {
    console.error('Error accepting friend request:', error);
    res.status(500).json({ error: 'Failed to accept friend request' });
  }
});

// Reject friend request
router.post('/requests/reject/:userId', auth, async (req, res) => {
  try {
    const receiverId = req.auth.userId;
    const senderId = req.params.userId;

    const [receiver, sender] = await Promise.all([
      User.findOne({ clerkId: receiverId }),
      User.findOne({ clerkId: senderId })
    ]);

    if (!sender) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove from requests
    receiver.receivedFriendRequests = receiver.receivedFriendRequests
      .filter(id => !id.equals(sender._id));
    sender.sentFriendRequests = sender.sentFriendRequests
      .filter(id => !id.equals(receiver._id));

    await Promise.all([
      receiver.save(),
      sender.save()
    ]);

    res.json({ message: 'Friend request rejected' });
  } catch (error) {
    console.error('Error rejecting friend request:', error);
    res.status(500).json({ error: 'Failed to reject friend request' });
  }
});

// Remove friend
router.delete('/:userId', auth, async (req, res) => {
  try {
    const userId = req.auth.userId;
    const friendId = req.params.userId;

    const [user, friend] = await Promise.all([
      User.findOne({ clerkId: userId }),
      User.findOne({ clerkId: friendId })
    ]);

    if (!friend) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove from friends lists
    user.friends = user.friends.filter(id => !id.equals(friend._id));
    friend.friends = friend.friends.filter(id => !id.equals(user._id));

    await Promise.all([
      user.save(),
      friend.save()
    ]);

    res.json({ message: 'Friend removed successfully' });
  } catch (error) {
    console.error('Error removing friend:', error);
    res.status(500).json({ error: 'Failed to remove friend' });
  }
});

// Get friend list
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.auth.userId;

    const user = await User.findOne({ clerkId: userId })
      .populate('friends', 'firstName lastName username avatar speakingLevel onlineStatus lastSeen')
      .populate('sentFriendRequests', 'firstName lastName username avatar speakingLevel')
      .populate('receivedFriendRequests', 'firstName lastName username avatar speakingLevel')
      .lean();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      friends: user.friends,
      sentRequests: user.sentFriendRequests,
      receivedRequests: user.receivedFriendRequests
    });
  } catch (error) {
    console.error('Error fetching friends:', error);
    res.status(500).json({ error: 'Failed to fetch friends' });
  }
});

export default router;