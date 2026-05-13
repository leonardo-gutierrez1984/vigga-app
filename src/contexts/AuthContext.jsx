import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [household, setHousehold] = useState(null);
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
        setHousehold(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId) {
    try {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      setProfile(profileData || null);

      // Busca o household se o perfil tiver household_id
      if (profileData?.household_id) {
        const { data: householdData } = await supabase
          .from("households")
          .select("*")
          .eq("id", profileData.household_id)
          .single();
        setHousehold(householdData || null);
      }
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
    setHousehold(null);
  }

  const userId = session?.user?.id || null;

  return (
    <AuthContext.Provider
      value={{
        session,
        profile: profile ? { ...profile, email: session?.user?.email } : null,
        household,
        isLoading,
        householdId: profile?.household_id || null,
        userId,
        userName: profile?.name || "",
        monthlyGoal: household?.monthly_goal || 5000,
        signOut,
        refreshProfile: () => userId && fetchProfile(userId),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
