import { Router } from 'express';
import { db } from '../config/firebase';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Get messages for a conversation
router.get('/:conversationId', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const currentUserUid = req.user?.uid;
    const { conversationId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    if (!currentUserUid) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Verify user is part of conversation
    const conversationDoc = await db.collection('conversations').doc(conversationId).get();
    
    if (!conversationDoc.exists) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    const conversationData = conversationDoc.data();
    if (!conversationData?.userIds.includes(currentUserUid)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get messages
    let messagesQuery = db
      .collection('conversations')
      .doc(conversationId)
      .collection('messages')
      .orderBy('timestamp', 'desc')
      .limit(Number(limit));

    if (Number(offset) > 0) {
      messagesQuery = messagesQuery.offset(Number(offset));
    }

    const messagesSnapshot = await messagesQuery.get();
    const messages = messagesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })).reverse(); // Reverse to get chronological order

    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Failed to fetch messages' });
  }
});

// Send a message
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const currentUserUid = req.user?.uid;
    const { conversationId, text, receiverId } = req.body;

    if (!currentUserUid) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!conversationId || !text || !receiverId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Verify user is part of conversation
    const conversationDoc = await db.collection('conversations').doc(conversationId).get();
    
    if (!conversationDoc.exists) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    const conversationData = conversationDoc.data();
    if (!conversationData?.userIds.includes(currentUserUid)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Create message
    const messageData = {
      text: text.trim(),
      senderId: currentUserUid,
      receiverId,
      timestamp: new Date(),
      conversationId,
      read: false
    };

    const messageRef = await db
      .collection('conversations')
      .doc(conversationId)
      .collection('messages')
      .add(messageData);

    // Update conversation last message
    await db.collection('conversations').doc(conversationId).update({
      lastMessage: text.trim(),
      lastUpdated: new Date(),
      lastMessageSenderId: currentUserUid
    });

    const newMessage = await messageRef.get();
    res.status(201).json({ id: newMessage.id, ...newMessage.data() });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Failed to send message' });
  }
});

// Mark messages as read
router.put('/:conversationId/read', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const currentUserUid = req.user?.uid;
    const { conversationId } = req.params;

    if (!currentUserUid) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Verify user is part of conversation
    const conversationDoc = await db.collection('conversations').doc(conversationId).get();
    
    if (!conversationDoc.exists) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    const conversationData = conversationDoc.data();
    if (!conversationData?.userIds.includes(currentUserUid)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Mark unread messages as read
    const unreadMessagesSnapshot = await db
      .collection('conversations')
      .doc(conversationId)
      .collection('messages')
      .where('receiverId', '==', currentUserUid)
      .where('read', '==', false)
      .get();

    const batch = db.batch();
    unreadMessagesSnapshot.docs.forEach(doc => {
      batch.update(doc.ref, { read: true });
    });

    await batch.commit();

    res.json({ message: 'Messages marked as read', count: unreadMessagesSnapshot.docs.length });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ message: 'Failed to mark messages as read' });
  }
});

// Delete a message
router.delete('/:messageId', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const currentUserUid = req.user?.uid;
    const { messageId } = req.params;
    const { conversationId } = req.body;

    if (!currentUserUid) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!conversationId) {
      return res.status(400).json({ message: 'Conversation ID is required' });
    }

    // Get message to verify ownership
    const messageDoc = await db
      .collection('conversations')
      .doc(conversationId)
      .collection('messages')
      .doc(messageId)
      .get();

    if (!messageDoc.exists) {
      return res.status(404).json({ message: 'Message not found' });
    }

    const messageData = messageDoc.data();
    if (messageData?.senderId !== currentUserUid) {
      return res.status(403).json({ message: 'Can only delete your own messages' });
    }

    // Delete message
    await messageDoc.ref.delete();

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ message: 'Failed to delete message' });
  }
});

export default router; 