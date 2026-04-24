import { createContext, useContext, useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithCustomToken,
  signOut,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe = () => {};
    let cancelled = false;

    const init = async () => {
      try {
        // Keep driver/admin session persisted locally until manual logout.
        await setPersistence(auth, browserLocalPersistence);
      } catch (error) {
        console.warn('Auth persistence setup failed:', error);
      }

      if (cancelled) return;

      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          setUser(firebaseUser);
          try {
            const userRef = doc(db, 'users', firebaseUser.uid);
            const timeout = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('timeout')), 8000)
            );
            let userDoc;
            try {
              userDoc = await Promise.race([getDoc(userRef), timeout]);
            } catch {
              // Timeout or network error - set basic data from auth
              console.warn('Firestore getDoc timed out, using auth data');
              setUserData({
                id: firebaseUser.uid,
                uid: firebaseUser.uid,
                name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
                email: firebaseUser.email,
                role: 'pending',
              });
              setLoading(false);
              return;
            }
            if (userDoc.exists()) {
              setUserData({ id: userDoc.id, ...userDoc.data() });
            } else {
              const newUserData = {
                uid: firebaseUser.uid,
                name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
                email: firebaseUser.email,
                phone: firebaseUser.phoneNumber || '',
                role: 'pending',
                createdAt: serverTimestamp(),
              };
              try {
                await Promise.race([setDoc(userRef, newUserData), new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 8000))]);
              } catch {
                console.warn('Firestore setDoc timed out');
              }
              setUserData({ id: firebaseUser.uid, ...newUserData });
            }
          } catch (error) {
            console.error('Error fetching user data:', error);
            // Fallback: use auth data so user can still navigate
            setUserData({
              id: firebaseUser.uid,
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
              email: firebaseUser.email,
              role: 'pending',
            });
          }
        } else {
          setUser(null);
          setUserData(null);
        }
        setLoading(false);
      });
    };

    init();
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const loginWithCustomToken = (token) => {
    return signInWithCustomToken(auth, token);
  };

  const logout = () => {
    return signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, userData, loading, login, loginWithCustomToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
