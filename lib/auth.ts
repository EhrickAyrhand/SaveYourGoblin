import { supabase } from './supabase';
import type {
  AuthResponse,
  SignUpData,
  SignInData,
  ResetPasswordData,
  UpdatePasswordData,
  VerifyEmailData,
  User,
} from '@/types/auth';

/**
 * Sign up a new user
 */
export async function signUp(data: SignUpData): Promise<AuthResponse> {
  try {
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });

    if (error) {
      return {
        user: null,
        error: {
          message: error.message,
          status: error.status,
        },
      };
    }

    return {
      user: authData.user
        ? {
            id: authData.user.id,
            email: authData.user.email || '',
            emailVerified: authData.user.email_confirmed_at !== null,
            createdAt: authData.user.created_at,
          }
        : null,
      error: null,
    };
  } catch (err) {
    return {
      user: null,
      error: {
        message: err instanceof Error ? err.message : 'An unexpected error occurred',
      },
    };
  }
}

/**
 * Sign in an existing user
 */
export async function signIn(data: SignInData): Promise<AuthResponse> {
  try {
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      return {
        user: null,
        error: {
          message: error.message,
          status: error.status,
        },
      };
    }

    return {
      user: authData.user
        ? {
            id: authData.user.id,
            email: authData.user.email || '',
            emailVerified: authData.user.email_confirmed_at !== null,
            createdAt: authData.user.created_at,
          }
        : null,
      error: null,
    };
  } catch (err) {
    return {
      user: null,
      error: {
        message: err instanceof Error ? err.message : 'An unexpected error occurred',
      },
    };
  }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<{ error: AuthResponse['error'] }> {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return {
        error: {
          message: error.message,
          status: error.status,
        },
      };
    }

    return { error: null };
  } catch (err) {
    return {
      error: {
        message: err instanceof Error ? err.message : 'An unexpected error occurred',
      },
    };
  }
}

/**
 * Request a password reset email
 */
export async function resetPassword(
  data: ResetPasswordData
): Promise<{ error: AuthResponse['error'] }> {
  try {
    // Get the current origin for the redirect URL
    const redirectTo =
      typeof window !== 'undefined'
        ? `${window.location.origin}/reset-password`
        : `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo,
    });

    if (error) {
      return {
        error: {
          message: error.message,
          status: error.status,
        },
      };
    }

    return { error: null };
  } catch (err) {
    return {
      error: {
        message: err instanceof Error ? err.message : 'An unexpected error occurred',
      },
    };
  }
}

/**
 * Update user password (used in reset password flow)
 */
export async function updatePassword(
  data: UpdatePasswordData
): Promise<{ error: AuthResponse['error'] }> {
  try {
    const { error } = await supabase.auth.updateUser({
      password: data.password,
    });

    if (error) {
      return {
        error: {
          message: error.message,
          status: error.status,
        },
      };
    }

    return { error: null };
  } catch (err) {
    return {
      error: {
        message: err instanceof Error ? err.message : 'An unexpected error occurred',
      },
    };
  }
}

/**
 * Verify user email with token
 * Note: Supabase typically handles email verification automatically via URL callbacks.
 * This function can be used for manual token verification if needed.
 */
export async function verifyEmail(
  data: VerifyEmailData
): Promise<{ error: AuthResponse['error'] }> {
  try {
    // Supabase email verification can be done via verifyOtp
    // The token format depends on how Supabase sends it (usually in URL hash)
    // Try to verify as OTP token
    const { error } = await supabase.auth.verifyOtp({
      token_hash: data.token,
      type: 'email',
    });

    if (error) {
      // If OTP verification fails, check if session was already established via URL callback
      // Supabase automatically handles email verification when detectSessionInUrl is true
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user && session.user.email_confirmed_at) {
        // Email is already verified (likely via URL callback)
        return { error: null };
      }

      return {
        error: {
          message: error.message,
          status: error.status,
        },
      };
    }

    return { error: null };
  } catch (err) {
    return {
      error: {
        message: err instanceof Error ? err.message : 'An unexpected error occurred',
      },
    };
  }
}

/**
 * Get the current user session
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return null;
    }

    return {
      id: session.user.id,
      email: session.user.email || '',
      emailVerified: session.user.email_confirmed_at !== null,
      createdAt: session.user.created_at,
    };
  } catch (err) {
    console.error('Error getting current user:', err);
    return null;
  }
}

/**
 * Resend verification email to the current user
 */
export async function resendVerificationEmail(email?: string): Promise<{ error: AuthResponse['error'] }> {
  try {
    // Get email from parameter or current user
    let emailToUse = email
    
    if (!emailToUse) {
      const user = await getCurrentUser()
      if (!user) {
        return {
          error: {
            message: 'No user logged in. Please provide an email address.',
          },
        }
      }
      emailToUse = user.email
    }

    // Get the current origin for the redirect URL
    const redirectTo =
      typeof window !== 'undefined'
        ? `${window.location.origin}/verify-email`
        : `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/verify-email`;

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: emailToUse,
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    if (error) {
      return {
        error: {
          message: error.message,
          status: error.status,
        },
      };
    }

    return { error: null };
  } catch (err) {
    return {
      error: {
        message: err instanceof Error ? err.message : 'An unexpected error occurred',
      },
    };
  }
}

/**
 * Check if the current user's email is verified
 */
export async function checkEmailVerification(): Promise<boolean> {
  try {
    const user = await getCurrentUser()
    return user?.emailVerified === true
  } catch (err) {
    console.error('Error checking email verification:', err)
    return false
  }
}

