import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

// ─────────────────────────────────────────────
// CONTEXTO
// ─────────────────────────────────────────────
const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else {
        setProfile(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId) {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      setProfile(data || null);
    } catch (err) {
      console.error("Erro ao buscar perfil:", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        isLoading,
        householdId: profile?.household_id || null,
        userId: session?.user?.id || null,
        userName: profile?.name || "",
        signOut,
        refreshProfile: () => session && fetchProfile(session.user.id),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Hook para usar em qualquer tela
export function useAuth() {
  return useContext(AuthContext);
}
