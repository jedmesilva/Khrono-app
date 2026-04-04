import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";

type User = {
  id: string;
  contact: string;
  name: string;
  firstName: string;
};

type AuthContextType = {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

async function fetchProfile(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    contact: data.email ?? data.phone ?? "",
    name: data.name,
    firstName: data.first_name,
  };
}

function userFromSession(session: Session): User {
  const meta = session.user.user_metadata ?? {};
  return {
    id: session.user.id,
    contact: session.user.email ?? "",
    name: meta.name ?? "",
    firstName: meta.first_name ?? "",
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  function applySession(session: Session) {
    const fallback = userFromSession(session);
    setUser(fallback);
    setIsAuthenticated(true);

    fetchProfile(session.user.id)
      .then((profile) => { if (profile) setUser(profile); })
      .catch(() => {});
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        applySession(session);
      }
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        applySession(session);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const refreshUser = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) applySession(session);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, user, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
