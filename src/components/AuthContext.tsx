"use client";
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { logActivity } from '@/lib/logger';

// הגדרת סוגי הנתונים
type Role = {
  name: string;
  permissions: Record<string, boolean>;
};

type UserProfile = {
  id: string;
  email: string;
  full_name: string;
  role: Role | null;
};

type AuthContextType = {
  user: any; 
  profile: UserProfile | null;
  loading: boolean;
  hasPermission: (permissionName: string) => boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async (userId: string) => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          id, email, full_name,
          role:roles (name, permissions)
        `)
        .eq('id', userId)
        .single();
        
      if (!error && data) {
        setProfile(data as unknown as UserProfile);
      }
      setLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const hasPermission = (permissionName: string) => {
    if (!profile?.role?.permissions) return false;
    return !!profile.role.permissions[permissionName];
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};