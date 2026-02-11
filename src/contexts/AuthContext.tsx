import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { UserRole } from '../lib/database.types';
import { ChangePasswordModal } from '../components/auth/ChangePasswordModal';

interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  department: string | null;
  phone: string | null;
  avatar_url: string | null;
  sales_target: number;
  language: string;
  theme: string;
  notifications_enabled: boolean;
  force_password_change?: boolean;
  account_status?: 'pending' | 'approved' | 'rejected' | null;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const signInInProgress = useRef(false);

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    const maxRetries = 3;
    const profileColumns = 'id,user_id,email,full_name,role,department,phone,avatar_url,sales_target,language,theme,notifications_enabled,account_status,rejection_reason,requested_role,preferred_language,force_password_change,created_at,updated_at';

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select(profileColumns)
          .eq('user_id', userId)
          .maybeSingle();

        if (error) {
          console.error(`Profile fetch attempt ${attempt}/${maxRetries} error:`, error);
          if (attempt < maxRetries) {
            await new Promise(r => setTimeout(r, 500 * attempt));
            continue;
          }
          return null;
        }

        if (data && (data as any).force_password_change === true) {
          setShowPasswordChange(true);
        }

        return data as Profile | null;
      } catch (err) {
        console.error(`Profile fetch attempt ${attempt}/${maxRetries} exception:`, err);
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 500 * attempt));
          continue;
        }
        return null;
      }
    }
    return null;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  }, [user, fetchProfile]);

  const handlePasswordChanged = useCallback(async () => {
    setShowPasswordChange(false);
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (!mounted) return;

      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        fetchProfile(currentSession.user.id).then((p) => {
          if (mounted) {
            setProfile(p);
            setLoading(false);
          }
        });
      } else {
        setLoading(false);
      }
    }).catch(() => {
      if (mounted) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;
      if (signInInProgress.current) return;

      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        fetchProfile(newSession.user.id).then((p) => {
          if (mounted) {
            setProfile(p);
            setLoading(false);
          }
        });
      } else {
        setProfile(null);
        setShowPasswordChange(false);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = useCallback(async (email: string, password: string): Promise<{ error: any }> => {
    signInInProgress.current = true;
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        signInInProgress.current = false;
        return { error };
      }

      if (!data.user || !data.session) {
        signInInProgress.current = false;
        return { error: new Error('Sign in failed. Please try again.') };
      }

      const profileData = await fetchProfile(data.user.id);

      if (!profileData) {
        await supabase.auth.signOut();
        signInInProgress.current = false;
        return { error: new Error('Account profile not found. Please contact an administrator.') };
      }

      if (profileData.account_status === 'pending') {
        await supabase.auth.signOut();
        signInInProgress.current = false;
        return {
          error: new Error('Your account is pending admin approval. Please wait for an administrator to approve your account.')
        };
      }

      if (profileData.account_status === 'rejected') {
        await supabase.auth.signOut();
        signInInProgress.current = false;
        return {
          error: new Error('Your account request was rejected. Please contact an administrator for more information.')
        };
      }

      setSession(data.session);
      setUser(data.user);
      setProfile(profileData);
      setLoading(false);
      signInInProgress.current = false;

      return { error: null };
    } catch (err) {
      signInInProgress.current = false;
      return { error: err };
    }
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
  }, []);

  const value = {
    user,
    profile,
    session,
    loading,
    signIn,
    signOut,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {showPasswordChange && user && (
        <ChangePasswordModal onPasswordChanged={handlePasswordChanged} />
      )}
    </AuthContext.Provider>
  );
};
