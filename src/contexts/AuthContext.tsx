import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { User, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  currentSessionId: string | null;
  signUp: (employeeId: string, email: string, password: string, role: string) => Promise<{ error: Error | AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | AuthError | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const currentSessionIdRef = useRef<string | null>(null);
  currentSessionIdRef.current = currentSessionId;

  const fetchUserProfile = useCallback(async (authUser: User): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, employee_id, role, email, created_at, last_login, login_count')
        .eq('id', authUser.id)
        .maybeSingle();

      if (error) {
        console.warn('AuthContext: Could not fetch user profile from DB:', error.message);
      }

      if (data) {
        setUserProfile(data as UserProfile);
        return data as UserProfile;
      }

      // If profile does not exist in public.users yet, build fallback from auth metadata
      const fallback: UserProfile = {
        id: authUser.id,
        employee_id: authUser.user_metadata?.employee_id || (authUser.email ? authUser.email.split('@')[0] : 'EMP001'),
        role: authUser.user_metadata?.role || 'employee',
        email: authUser.email || '',
        created_at: authUser.created_at || new Date().toISOString()
      };

      setUserProfile(fallback);

      // Attempt non-blocking profile creation
      try {
        await supabase
          .from('users')
          .upsert([
            {
              id: fallback.id,
              employee_id: fallback.employee_id,
              role: fallback.role,
              email: fallback.email,
              created_at: fallback.created_at
            }
          ], { onConflict: 'id' });
      } catch (insertErr) {
        console.warn('AuthContext: Could not upsert fallback profile:', insertErr);
      }

      return fallback;
    } catch (err) {
      console.error('AuthContext: Unexpected error in fetchUserProfile:', err);
      return null;
    }
  }, []);

  const logUserLogin = useCallback(async (userId: string, role?: string) => {
    try {
      const effectiveRole = role || 'employee';
      const { data, error } = await supabase.rpc('log_user_login', {
        p_user_id: userId,
        p_role: effectiveRole,
        p_ip_address: null,
        p_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null
      });

      if (error) {
        // RPC might not exist yet in database
        console.warn('AuthContext: log_user_login RPC not available or failed:', error.message);
      } else if (data) {
        setCurrentSessionId(String(data));
      }
    } catch (err) {
      console.warn('AuthContext: Error invoking log_user_login RPC:', err);
    }
  }, []);

  const logUserLogout = useCallback(async (sessionId: string) => {
    try {
      const { error } = await supabase.rpc('log_user_logout', {
        p_session_id: sessionId
      });
      if (error) {
        console.warn('AuthContext: log_user_logout RPC not available or failed:', error.message);
      }
    } catch (err) {
      console.warn('AuthContext: Error invoking log_user_logout RPC:', err);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchUserProfile(user);
    }
  }, [user, fetchUserProfile]);

  useEffect(() => {
    let mounted = true;

    // Safety timeout: Never leave auth in an infinite loading state
    const safetyTimer = setTimeout(() => {
      if (mounted) {
        setLoading((prev) => {
          if (prev) {
            console.warn('AuthContext: Safety timeout reached, resolving auth loading state.');
            return false;
          }
          return prev;
        });
      }
    }, 4000);

    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('AuthContext: Error getting initial session:', error);
        }

        if (mounted) {
          const initialUser = session?.user ?? null;
          setUser(initialUser);

          if (initialUser) {
            await fetchUserProfile(initialUser);
          }
        }
      } catch (err) {
        console.error('AuthContext: Error in getInitialSession:', err);
      } finally {
        if (mounted) {
          setLoading(false);
          clearTimeout(safetyTimer);
        }
      }
    };

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        const profile = await fetchUserProfile(currentUser);
        if (event === 'SIGNED_IN') {
          await logUserLogin(currentUser.id, profile?.role);
        }
      } else {
        setUserProfile(null);
        if (currentSessionIdRef.current && event === 'SIGNED_OUT') {
          await logUserLogout(currentSessionIdRef.current);
          setCurrentSessionId(null);
        }
      }

      setLoading(false);
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, [fetchUserProfile, logUserLogin, logUserLogout]);

  const signUp = async (employeeId: string, email: string, password: string, role: string) => {
    try {
      // 1. Check if an account with this employee_id or email already exists in public table
      try {
        const { data: existingUser } = await supabase
          .from('users')
          .select('email, employee_id')
          .or(`email.eq.${email},employee_id.eq.${employeeId}`)
          .maybeSingle();

        if (existingUser) {
          const errorMsg = existingUser.email === email
            ? 'An account with this email already exists'
            : 'An account with this employee ID already exists';
          return { error: new Error(errorMsg) };
        }
      } catch {
        // Table might be protected by RLS or not populated; proceed to Supabase Auth
      }

      // 2. Register user through Supabase Auth (pass employee_id and role as user metadata)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            employee_id: employeeId,
            role: role
          }
        }
      });

      if (authError) {
        return { error: authError };
      }

      // 3. Create or update profile in public.users table WITHOUT plaintext password
      if (authData.user) {
        const { error: profileError } = await supabase
          .from('users')
          .upsert([
            {
              id: authData.user.id,
              employee_id: employeeId,
              role: role,
              email: email,
              created_at: new Date().toISOString()
            }
          ], { onConflict: 'id' });

        if (profileError) {
          console.warn('AuthContext: Profile upsert returned notice (trigger will handle if configured):', profileError.message);
        }
      }

      return { error: null };
    } catch (err: unknown) {
      console.error('AuthContext: SignUp exception:', err);
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return { error };
      }

      return { error: null };
    } catch (err: unknown) {
      console.error('AuthContext: SignIn exception:', err);
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  };

  const signOut = async () => {
    try {
      if (currentSessionIdRef.current) {
        await logUserLogout(currentSessionIdRef.current);
      }
      setUser(null);
      setUserProfile(null);
      setCurrentSessionId(null);
      await supabase.auth.signOut();
    } catch (err) {
      console.error('AuthContext: Error during signOut:', err);
      setUser(null);
      setUserProfile(null);
      setCurrentSessionId(null);
    }
  };

  const value = {
    user,
    userProfile,
    loading,
    currentSessionId,
    signUp,
    signIn,
    signOut,
    refreshProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
