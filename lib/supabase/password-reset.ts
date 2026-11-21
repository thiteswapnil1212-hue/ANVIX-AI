/**
 * Password-reset completion (the second half of "forgot password").
 *
 * `resetPasswordForEmail` sends a link that lands on /auth and fires the
 * Supabase PASSWORD_RECOVERY event. The auth page then uses these helpers
 * to let the user set a new password via `updateUser` — without them the
 * recovery link just signs the user in and bounces them to chat with no
 * way to change the password.
 */

import { friendlyAuthError } from "./auth-errors.ts";

/** Minimal shape of the client surface this needs — easy to fake in tests. */
export interface PasswordUpdateClient {
  auth: {
    updateUser: (attributes: {
      password: string;
    }) => Promise<{ error: { message: string } | null }>;
  };
}

/**
 * Validates a new password + confirmation. Returns a plain-words error
 * message, or null when the pair is usable.
 */
export function validateNewPassword(
  password: string,
  confirmPassword: string
): string | null {
  if (password.length < 8) {
    return "Choose a new password of at least 8 characters.";
  }

  if (password !== confirmPassword) {
    return "The two passwords don't match. Check them and try again.";
  }

  return null;
}

/**
 * Sets the signed-in user's password. Returns a plain-words error message
 * on failure, or null on success.
 */
export async function updatePassword(
  client: PasswordUpdateClient,
  password: string
): Promise<string | null> {
  try {
    const { error } = await client.auth.updateUser({ password });
    if (error) return friendlyAuthError(error);
    return null;
  } catch {
    return "Something went wrong while contacting the auth service. Please try again.";
  }
}
