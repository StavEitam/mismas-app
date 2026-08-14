import { useEffect, useState } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { subscribeToAuthState } from '../lib/auth';

/**
 * Tracks the current Firebase Auth user. `loading` stays true until the
 * first auth-state event fires (needed on cold start, since persisted
 * sessions resolve asynchronously).
 */
export function useAuthUser() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToAuthState((u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { user, loading };
}
