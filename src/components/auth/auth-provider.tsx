"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/lib/types";

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  profileError: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  profileError: false,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState(false);
  const userRef = useRef<User | null>(null);

  const supabase = createClient();

  async function loadProfile() {
    setProfileError(false);
    try {
      const res = await fetch("/api/profile");
      if (!res.ok) {
        setProfileError(true);
        setProfile(null);
        return;
      }
      const data = await res.json();
      setProfile(data);
    } catch {
      setProfileError(true);
      setProfile(null);
    }
  }

  useEffect(() => {
    const {
      data: { subscription },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } = supabase.auth.onAuthStateChange(async (_event: any, session: any) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      userRef.current = currentUser;

      if (currentUser) {
        await loadProfile();
      } else {
        setProfile(null);
        setProfileError(false);
      }

      setLoading(false);
    });

    const timeout = setTimeout(() => setLoading(false), 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = async () => {
    setUser(null);
    userRef.current = null;
    setProfile(null);
    setProfileError(false);
    try {
      await supabase.auth.signOut();
    } catch {
      // signOut can fail with expired/invalid tokens — ignore and force navigate
    }
    window.location.href = "/login";
  };

  const refreshProfile = async () => {
    await loadProfile();
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, profileError, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
