"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "../lib/supabase";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface Profile {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  avatar_url: string;
  is_admin: boolean;
  created_at: string;
}

interface AuthContextType {
  user: Profile | null;
  supabaseUser: SupabaseUser | null;
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

interface RegisterData {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  password: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch profile from Supabase
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        return null;
      }
      return data as Profile;
    } catch {
      return null;
    }
  };

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setSupabaseUser(session.user);
          const profile = await fetchProfile(session.user.id);
          if (profile) {
            setUser(profile);
            setIsAdmin(profile.is_admin);
          }
        }
      } catch {}
      setIsLoading(false);
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        setSupabaseUser(session.user);
        // Small delay to allow trigger to create profile
        setTimeout(async () => {
          const profile = await fetchProfile(session.user.id);
          if (profile) {
            setUser(profile);
            setIsAdmin(profile.is_admin);
          }
        }, 500);
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setSupabaseUser(null);
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        return { success: false, error: error.message === "Invalid login credentials" ? "Correo o contrasena incorrectos" : error.message };
      }
      if (data.user) {
        const profile = await fetchProfile(data.user.id);
        if (profile) {
          setUser(profile);
          setIsAdmin(profile.is_admin);
        }
      }
      return { success: true };
    } catch {
      return { success: false, error: "Error al iniciar sesion" };
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            nombre: data.nombre,
            apellido: data.apellido,
            telefono: data.telefono,
          },
        },
      });
      if (error) {
        if (error.message.includes("already registered")) {
          return { success: false, error: "Ya existe una cuenta con este correo" };
        }
        return { success: false, error: error.message };
      }

      // Update profile with extra data
      if (authData.user) {
        await supabase.from("profiles").upsert({
          id: authData.user.id,
          nombre: data.nombre,
          apellido: data.apellido,
          email: data.email,
          telefono: data.telefono,
        });
        const profile = await fetchProfile(authData.user.id);
        if (profile) {
          setUser(profile);
          setIsAdmin(profile.is_admin);
        }
      }
      return { success: true };
    } catch {
      return { success: false, error: "Error al crear la cuenta" };
    }
  };

  const loginWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch {
      return { success: false, error: "Error al iniciar con Google" };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSupabaseUser(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ user, supabaseUser, isAdmin, isLoading, login, register, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
