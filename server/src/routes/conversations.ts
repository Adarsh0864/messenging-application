import { Router } from 'express';
import { db } from '../config/firebase';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Get all conversations for current user
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const currentUserUid = req.user?.uid;
    if (!currentUserUid) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const conversationsSnapshot = await db
      .collection('conversations')
      .where('userIds', 'array-contains', currentUserUid)
      .orderBy('lastUpdated', 'desc')
      .get();

    const conversations = conversationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ message: 'Failed to fetch conversations' });
  }
});

// Get specific conversation
router.get('/:conversationId', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const currentUserUid = req.user?.uid;
    const { conversationId } = req.params;

    if (!currentUserUid) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Check if user is part of the conversation
    const conversationDoc = await db.collection('conversations').doc(conversationId).get();
    
    if (!conversationDoc.exists) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    const conversationData = conversationDoc.data();
    if (!conversationData?.userIds.includes(currentUserUid)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ id: conversationDoc.id, ...conversationData });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ message: 'Failed to fetch conversation' });
  }
});

// Create new conversation
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const currentUserUid = req.user?.uid;
    const { participantUid } = req.body;

    if (!currentUserUid) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!participantUid) {
      return res.status(400).json({ message: 'Participant UID is required' });
    }

    // Check if conversation already exists
    const existingConversationSnapshot = await db
      .collection('conversations')
      .where('userIds', 'array-contains', currentUserUid)
      .get();

    const existingConversation = existingConversationSnapshot.docs.find(doc => {
      const data = doc.data();
      return data.userIds.includes(participantUid) && data.userIds.length === 2;
    });

    if (existingConversation) {
      return res.json({ id: existingConversation.id, ...existingConversation.data() });
    }

    // Create new conversation
    const newConversationRef = await db.collection('conversations').add({
      userIds: [currentUserUid, participantUid],
      lastMessage: '',
      lastUpdated: new Date(),
      lastMessageSenderId: null
    });

    const newConversation = await newConversationRef.get();
    res.status(201).json({ id: newConversation.id, ...newConversation.data() });
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ message: 'Failed to create conversation' });
  }
});

// Update conversation (last message, etc.)
router.put('/:conversationId', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const currentUserUid = req.user?.uid;
    const { conversationId } = req.params;
    const { lastMessage } = req.body;

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

    // Update conversation
    await db.collection('conversations').doc(conversationId).update({
      lastMessage: lastMessage || '',
      lastUpdated: new Date(),
      lastMessageSenderId: currentUserUid
    });

    res.json({ message: 'Conversation updated successfully' });
  } catch (error) {
    console.error('Error updating conversation:', error);
    res.status(500).json({ message: 'Failed to update conversation' });
  }
});

export default router; 