'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

interface UserProfile {
  uid: string;
  name: string;
  email: string;
  lastSeen: any;
  online: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function useAuth() {
  return useContext(AuthContext);
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  async function register(email: string, password: string, name: string) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Create user profile in Firestore
    const userProfile = {
      uid: user.uid,
      name,
      email: user.email!,
      lastSeen: new Date(),
      online: true
    };
    
    await setDoc(doc(db, 'users', user.uid), userProfile);
    setUserProfile(userProfile);
  }

  async function login(email: string, password: string) {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update user online status
    await setDoc(doc(db, 'users', user.uid), {
      online: true,
      lastSeen: new Date()
    }, { merge: true });
  }

  async function logout() {
    if (currentUser) {
      // Update user offline status
      await setDoc(doc(db, 'users', currentUser.uid), {
        online: false,
        lastSeen: new Date()
      }, { merge: true });
    }
    
    await signOut(auth);
    setUserProfile(null);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Fetch user profile from Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserProfile(userDoc.data() as UserProfile);
        }
        
        // Update online status
        await setDoc(doc(db, 'users', user.uid), {
          online: true,
          lastSeen: new Date()
        }, { merge: true });
      } else {
        setUserProfile(null);
      }
      
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userProfile,
    login,
    register,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
} 