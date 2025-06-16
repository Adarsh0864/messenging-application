import { Request, Response, NextFunction } from 'express';
import { auth } from '../config/firebase';

interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    name?: string;
  };
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Unauthorized: No token provided' });
      return;
    }

    const token = authHeader.split(' ')[1];
    
    // Verify the Firebase ID token
    const decodedToken = await auth.verifyIdToken(token);
    
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name
    };
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Unauthorized: Invalid token' });
    return;
  }
};

export { AuthenticatedRequest }; 