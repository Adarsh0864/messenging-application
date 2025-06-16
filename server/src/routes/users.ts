import { Router } from 'express';
import { db } from '../config/firebase';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Get all users (for contacts list)
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const currentUserUid = req.user?.uid;
    if (!currentUserUid) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const usersSnapshot = await db.collection('users').get();
    const users = usersSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(user => user.id !== currentUserUid); // Exclude current user

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// Get user profile
router.get('/profile/:uid', authMiddleware, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { uid } = req.params;
    const userDoc = await db.collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const userData = { id: userDoc.id, ...userDoc.data() };
    res.json(userData);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Failed to fetch user profile' });
  }
});

// Update user profile
router.put('/profile', authMiddleware, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const currentUserUid = req.user?.uid;
    if (!currentUserUid) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { name, status } = req.body;
    const updateData: any = {
      lastSeen: new Date()
    };

    if (name) updateData.name = name;
    if (status !== undefined) updateData.online = status;

    await db.collection('users').doc(currentUserUid).update(updateData);
    
    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

// Update online status
router.post('/status', authMiddleware, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const currentUserUid = req.user?.uid;
    if (!currentUserUid) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { online } = req.body;
    
    await db.collection('users').doc(currentUserUid).update({
      online: online,
      lastSeen: new Date()
    });

    res.json({ message: 'Status updated successfully' });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ message: 'Failed to update status' });
  }
});

export default router; 