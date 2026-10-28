import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback
} from 'react';

import { User, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  currentSessionId: string | null;
  signUp: (
    employeeId: string,
    email: string,
    password: string,
    role: string
  ) => Promise<{ error: Error | AuthError | null }>;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: Error | AuthError | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

export function AuthProvider({
  children
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const currentSessionIdRef = useRef<string | null>(null);
  currentSessionIdRef.current = currentSessionId;

  // Fetch the profile and report database errors accurately.
  const fetchUserProfile = useCallback(
    async (authUser: User): Promise<UserProfile | null> => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, employee_id, role, email, created_at')
          .eq('id', authUser.id)
          .maybeSingle();

        if (error) {
          console.error(
            'AuthContext: Profile read failed:',
            error.message,
            error.code,
            error.details,
            error.hint
          );

          // Keep a temporary profile for the current UI session.
          const fallback: UserProfile = {
            id: authUser.id,
            employee_id:
              authUser.user_metadata?.employee_id ||
              authUser.email?.split('@')[0] ||
              'EMP001',
            role: authUser.user_metadata?.role || 'employee',
            email: authUser.email || '',
            created_at: authUser.created_at || new Date().toISOString()
          };

          setUserProfile(fallback);
          return fallback;
        }

        if (data) {
          setUserProfile(data as UserProfile);
          return data as UserProfile;
        }

        // No database profile exists. Build a temporary fallback.
        const fallback: UserProfile = {
          id: authUser.id,
          employee_id:
            authUser.user_metadata?.employee_id ||
            authUser.email?.split('@')[0] ||
            'EMP001',
          role: authUser.user_metadata?.role || 'employee',
          email: authUser.email || '',
          created_at: authUser.created_at || new Date().toISOString()
        };

        setUserProfile(fallback);

        // Attempt to create the missing profile and CHECK the returned error.
        const { error: insertError } = await supabase
          .from('users')
          .upsert(
            {
              id: fallback.id,
              employee_id: fallback.employee_id,
              role: fallback.role,
              email: fallback.email,
              created_at: fallback.created_at
            },
            { onConflict: 'id' }
          );

        if (insertError) {
          console.error(
            'AuthContext: Profile upsert failed:',
            insertError.message,
            insertError.code,
            insertError.details,
            insertError.hint
          );
        } else {
          console.info('AuthContext: Profile upsert succeeded.');

          // Confirm that the profile was actually saved.
          const { data: savedProfile, error: verifyError } = await supabase
            .from('users')
            .select('id, employee_id, role, email, created_at')
            .eq('id', authUser.id)
            .maybeSingle();

          if (verifyError) {
            console.error(
              'AuthContext: Profile verification failed:',
              verifyError.message
            );
          } else if (savedProfile) {
            setUserProfile(savedProfile as UserProfile);
            return savedProfile as UserProfile;
          } else {
            console.warn(
              'AuthContext: Upsert returned no error, but no profile was visible afterward.'
            );
          }
        }

        // Keep the fallback so the UI can continue to function.
        return fallback;
      } catch (err) {
        console.error(
          'AuthContext: Unexpected profile error:',
          err
        );
        return null;
      }
    },
    []
  );

  const logUserLogin = useCallback(
    async (userId: string, role?: string) => {
      try {
        const { data, error } = await supabase.rpc('log_user_login', {
          p_user_id: userId,
          p_role: role || 'employee',
          p_ip_address: null,
          p_user_agent:
            typeof navigator !== 'undefined'
              ? navigator.userAgent
              : null
        });

        if (error) 
        {
          console.warn(
            'AuthContext: log_user_login failed:',
            error.message
          );
        } 
      } catch (err)
     {
        console.warn('AuthContext: Login logging error:', err);
      }
    },
    []
  );

  const logUserLogout = useCallback(async (sessionId: string) => {
    try {
      const { error } = await supabase.rpc('log_user_logout', {
        p_session_id: sessionId
      });

      if (error) {
        console.warn(
          'AuthContext: log_user_logout failed:',
          error.message
        );
      }
    } catch (err) {
      console.warn('AuthContext: Logout logging error:', err);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchUserProfile(user);
    }
  }, [user, fetchUserProfile]);

  useEffect(() => {
    let mounted = true;

    const safetyTimer = setTimeout(() => {
      if (mounted) {
        setLoading(false);
      }
    }, 8000);

    const getInitialSession = async () => {
      try {
        const {
          data: { session },
          error
        } = await supabase.auth.getSession();

        if (error) {
          console.error(
            'AuthContext: Initial session error:',
            error.message
          );
        }

        if (!mounted) return;

        const initialUser = session?.user ?? null;
        setUser(initialUser);

        if (initialUser) {
          await fetchUserProfile(initialUser);
        }
      } catch (err) {
        console.error(
          'AuthContext: Could not get initial session:',
          err
        );
      } finally {
        if (mounted) {
          setLoading(false);
          clearTimeout(safetyTimer);
        }
      }
    };

    void getInitialSession();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      const currentUser = session?.user ?? null;

      setUser(currentUser);

      if (currentUser) {
        // Defer database work until the auth callback has returned.
        setTimeout(() => {
          if (!mounted) return;

          void (async () => {
            const profile = await fetchUserProfile(currentUser);

            if (mounted && event === 'SIGNED_IN') {
              await logUserLogin(currentUser.id, profile?.role);
            }
          })();
        }, 0);
      } else {
        setUserProfile(null);

        const previousSessionId = currentSessionIdRef.current;

        setCurrentSessionId(null);

        if (previousSessionId && event === 'SIGNED_OUT') {
          void logUserLogout(previousSessionId);
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

  
const signUp = async (
  employeeId: string,
  email: string,
  password: string,
  role: string
): Promise<{ error: Error | AuthError | null }> => {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedEmployeeId = employeeId.trim();
    const requestedRole = role.trim().toLowerCase();

    if (!['supervisor', 'vendor'].includes(requestedRole)) {
      return {
        error: new Error('Please select Supervisor or Vendor.')
      };
    }

    if (!normalizedEmployeeId) {
      return {
        error: new Error('Employee ID is required.')
      };
    }

    const { error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          employee_id: normalizedEmployeeId,
          role: requestedRole
        }
      }
    });

    if (error) {
      return { error };
    }

    // The database trigger creates the profile automatically.
    // Email confirmation can remain enabled; no active session
    // is required to create the profile.
    return { error: null };
  } catch (err: unknown) {
    console.error('AuthContext: Signup exception:', err);

    return {
      error: err instanceof Error
        ? err
        : new Error(String(err))
    };
  }
};

  const signIn = async (
    email: string,
    password: string
  ): Promise<{ error: Error | AuthError | null }> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      });

      if (error) {
        return { error };
      }

      return { error: null };
    } catch (err: unknown) {
      console.error('AuthContext: Signin exception:', err);

      return {
        error: err instanceof Error ? err : new Error(String(err))
      };
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      const sessionId = currentSessionIdRef.current;

      setUser(null);
      setUserProfile(null);
      setCurrentSessionId(null);

      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error(
          'AuthContext: Supabase signout failed:',
          error.message
        );
      }

      if (sessionId) {
        await logUserLogout(sessionId);
      }
    } catch (err) {
      console.error('AuthContext: Signout exception:', err);
    }
  };

  const value: AuthContextType = {
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