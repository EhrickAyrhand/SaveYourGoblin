/**
 * Authentication and route protection utilities
 * 
 * Provides helper functions for checking authentication and email verification
 * on both client and server side.
 */

import { getCurrentUser } from './auth'
import type { User } from '@/types/auth'

/**
 * Client-side function to check if user is authenticated
 * Returns the user if authenticated, null otherwise
 */
export async function checkAuthClient(): Promise<User | null> {
  try {
    const user = await getCurrentUser()
    return user
  } catch (err) {
    console.error('Error checking auth client:', err)
    return null
  }
}

/**
 * Client-side function to check if user's email is verified
 * Returns true if verified, false otherwise
 * Returns false if user is not authenticated
 */
export async function checkVerificationClient(): Promise<boolean> {
  try {
    const user = await getCurrentUser()
    if (!user) return false
    return user.emailVerified === true
  } catch (err) {
    console.error('Error checking verification client:', err)
    return false
  }
}

/**
 * Client-side function to require authentication
 * Throws an error if user is not authenticated
 */
export async function requireAuthClient(): Promise<User> {
  const user = await checkAuthClient()
  if (!user) {
    throw new Error('Authentication required')
  }
  return user
}

/**
 * Client-side function to require email verification
 * Throws an error if user is not authenticated or email is not verified
 */
export async function requireVerifiedEmailClient(): Promise<User> {
  const user = await requireAuthClient()
  if (!user.emailVerified) {
    throw new Error('Email verification required')
  }
  return user
}
