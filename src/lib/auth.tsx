import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, metadata?: Record<string, any>) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  supabase: typeof supabase;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const timeoutId = setTimeout(() => {
      if (isMounted && loading) {
        console.warn('Auth loading timeout - forcing loading to false');
        setLoading(false);
      }
    }, 5000);

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (isMounted) {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        }
      })
      .catch((error) => {
        console.error('Error getting session:', error);
        if (isMounted) {
          setLoading(false);
        }
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        if (isMounted) {
          console.log('Auth state changed:', event, session?.user?.email);
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        }
      })();
    });

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, metadata?: Record<string, any>) => {
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata || {}
      }
    });

    // Log successful signup as a login event
    if (!error && data?.user) {
      try {
        await supabase.from('login_history').insert({
          user_id: data.user.id,
          logged_in_at: new Date().toISOString(),
          user_agent: navigator.userAgent,
          login_method: 'email/password',
          success: true
        });
      } catch (logError) {
        console.warn('Failed to log signup login history:', logError);
      }
    }

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // Log successful login
    if (!error && data?.user) {
      try {
        await supabase.from('login_history').insert({
          user_id: data.user.id,
          logged_in_at: new Date().toISOString(),
          user_agent: navigator.userAgent,
          login_method: 'email/password',
          success: true
        });
      } catch (logError) {
        console.warn('Failed to log login history:', logError);
      }
    }

    return { error };
  };

  const signOut = async () => {
    console.log('🔴 [AUTH] Starting signOut...');

    // Clear local state first
    setSession(null);
    setUser(null);

    // Try to sign out from Supabase (but don't fail if it errors)
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.warn('🔴 [AUTH] Supabase signOut API error (continuing anyway):', error);
      } else {
        console.log('🔴 [AUTH] Supabase signOut successful');
      }
    } catch (err) {
      console.warn('🔴 [AUTH] Supabase signOut exception (continuing anyway):', err);
    }

    // Clear all auth-related storage
    try {
      const storageKeys = Object.keys(localStorage);
      storageKeys.forEach(key => {
        if (key.includes('supabase') || key.includes('auth')) {
          console.log('🔴 [AUTH] Clearing localStorage key:', key);
          localStorage.removeItem(key);
        }
      });
    } catch (err) {
      console.warn('🔴 [AUTH] Error clearing localStorage:', err);
    }

    console.log('🔴 [AUTH] signOut complete');
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    supabase,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export { supabase };
