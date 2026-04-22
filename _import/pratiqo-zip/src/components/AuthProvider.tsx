import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { seedTeachers, seedStudentProgress } from '../lib/seed';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  profile: any | null;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, profile: null });

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    seedTeachers();
    const unsub = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        seedStudentProgress(user.uid);
        // Sync user profile
        const userRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          setProfile(snap.data());
        } else {
          const newProfile = {
            id: user.uid,
            name: user.displayName || 'Étudiant',
            email: user.email,
            role: 'student',
            photoUrl: user.photoURL,
          };
          await setDoc(userRef, newProfile);
          setProfile(newProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return unsub;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, profile }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
