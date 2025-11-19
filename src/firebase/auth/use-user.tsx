'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth, useFirestore } from '@/firebase/provider';

export interface UseUserResult {
  user: User | null;
  isLoading: boolean;
}

/**
 * React hook to get the current user and their auth state.
 * It will attempt to sign in anonymously if no user is found.
 */
export function useUser(): UseUserResult {
  const auth = useAuth();
  const firestore = useFirestore();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!auth || !firestore) {
      if (auth === null || firestore === null) {
        setIsLoading(false);
      }
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is signed in.
        const userRef = doc(firestore, 'users', user.uid);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
            // Use setDoc with merge:true to create or update, which is safer.
            // This also prevents overwriting existing fields if the doc exists but is empty.
            await setDoc(userRef, {
                displayName: user.displayName,
                email: user.email,
                photoURL: user.photoURL,
                createdAt: serverTimestamp() // Add a creation timestamp
            }, { merge: true });
        }
        setUser(user);
      } else {
        // User is signed out.
        setUser(null);
      }
       setIsLoading(false);
    });

    // Cleanup the subscription on unmount
    return () => unsubscribe();
  }, [auth, firestore]);

  return { user, isLoading };
}
