
'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useAuth } from '@/firebase/provider';
import { initiateAnonymousSignIn } from '@/firebase/non-blocking-login';

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
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        setIsLoading(false);
      } else {
        // No user is signed in, so we initiate an anonymous sign-in.
        // The onAuthStateChanged listener will be triggered again once sign-in is complete.
        initiateAnonymousSignIn(auth);
      }
    });

    // Cleanup the subscription on unmount
    return () => unsubscribe();
  }, [auth]); // Dependency array ensures this runs only when the auth instance changes.

  return { user, isLoading };
}

    