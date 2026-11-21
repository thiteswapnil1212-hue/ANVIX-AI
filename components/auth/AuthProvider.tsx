"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";

interface AuthContextValue {
  /** True when this deployment has Supabase env vars set. */
  configured: boolean;
  user: User | null;
  session: Session | null;
  /** True until the initial session check resolves. */
  loading: boolean;
  /**
   * True when the current session came from a password-recovery link.
   * The auth page uses this to show the set-a-new-password form instead
   * of bouncing the user to chat. Cleared once the password is updated
   * (USER_UPDATED), on any other sign-in, and on sign-out.
   */
  isPasswordRecovery: boolean;
  /**
   * Signs out. Returns true only when Supabase confirmed the sign-out —
   * on failure (e.g. network) it returns false and the local session
   * is left untouched, so the UI never claims signed-out while the
   * server session is still valid.
   */
  signOut: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue>({
  configured: false,
  user: null,
  session: null,
  loading: true,
  isPasswordRecovery: false,
  signOut: async () => false,
});

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    if (!supabase) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- no auth client on this deployment; resolve loading immediately
      setLoading(false);
      return;
    }

    let cancelled = false;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (cancelled) return;
        setSession(data.session);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
      if (event === "PASSWORD_RECOVERY") {
        setIsPasswordRecovery(true);
      } else if (
        event === "USER_UPDATED" ||
        event === "SIGNED_IN" ||
        event === "SIGNED_OUT" ||
        event === "INITIAL_SESSION" ||
        event === "TOKEN_REFRESHED"
      ) {
        setIsPasswordRecovery(false);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return false;
    try {
      const { error } = await supabase.auth.signOut();
      if (error) return false;
    } catch {
      return false;
    }
    setSession(null);
    return true;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      configured: isSupabaseConfigured,
      user: session?.user ?? null,
      session,
      loading,
      isPasswordRecovery,
      signOut,
    }),
    [session, loading, isPasswordRecovery, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
