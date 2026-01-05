export interface User {
  id: string;
  email: string;
  emailVerified?: boolean;
  createdAt?: string;
}

export interface AuthResponse {
  user: User | null;
  error: AuthError | null;
}

export interface AuthError {
  message: string;
  status?: number;
}

export interface SignUpData {
  email: string;
  password: string;
  confirmPassword?: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface ResetPasswordData {
  email: string;
}

export interface UpdatePasswordData {
  password: string;
  confirmPassword: string;
  token?: string;
}

export interface VerifyEmailData {
  token: string;
}

