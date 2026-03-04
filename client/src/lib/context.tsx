import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';

type AppState = {
  user: User | null;
};

function getAuthClient() {
  const auth = (supabase as any)?.auth;
  if (!auth) return null;
  if (typeof auth.getUser !== 'function') return null;
  return auth;
}

export function useApp(): AppState {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let active = true;
    const auth = getAuthClient();

    if (!auth) {
      return;
    }

    auth
      .getUser()
      .then(({ data }: { data?: { user?: User | null } }) => {
        if (!active) return;
        setUser(data?.user ?? null);
      })
      .catch(() => {
        if (!active) return;
        setUser(null);
      });

    const { data: subscriptionData } = auth.onAuthStateChange(
      (_event: string, session: { user?: User | null } | null) => {
        if (!active) return;
        setUser(session?.user ?? null);
      }
    );

    return () => {
      active = false;
      const subscription = subscriptionData?.subscription ?? subscriptionData;
      if (subscription?.unsubscribe) {
        subscription.unsubscribe();
      }
    };
  }, []);

  return { user };
}
