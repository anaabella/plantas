'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
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
  const [user, setUser] = useState<User | null>(auth?.currentUser || null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!auth || !firestore) {
      setIsLoading(false); // Firebase services not ready
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is signed in.
        // Check if it's a new user by checking if their document exists.
        const userRef = doc(firestore, 'users', user.uid);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
            // New user, create their profile document.
            await setDoc(userRef, {
                displayName: user.displayName,
                email: user.email,
                photoURL: user.photoURL,
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
