import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';

/**
 * Password hashing helpers.
 *
 * Why pre-hash with SHA-256?
 *   bcrypt silently truncates input at 72 bytes. With our DTO allowing up
 *   to 128 characters (and unicode that can be ≥4 bytes/char), two distinct
 *   passwords sharing the same first 72 bytes would hash identically and
 *   accept each other on login. Pre-hashing with SHA-256 → base64 yields a
 *   fixed 44-character input to bcrypt, eliminating the truncation surface.
 *
 *   This is the same pattern used by Dropbox and Auth0.
 *
 * Backward compatibility:
 *   Existing hashes were stored as bare bcrypt(`$2b$...`). New hashes are
 *   prefixed `v2$` so verifyPassword() can route to the correct algorithm.
 *   Legacy hashes still verify against bare bcrypt; on the next successful
 *   login the caller can opt to upgrade the stored hash via `hashPassword()`.
 */

export const PASSWORD_VERSION_PREFIX = 'v2$';
const BCRYPT_COST = 12;

export async function hashPassword(plain: string): Promise<string> {
  const sha256 = createHash('sha256').update(plain, 'utf-8').digest('base64');
  const bcrypted = await bcrypt.hash(sha256, BCRYPT_COST);
  return `${PASSWORD_VERSION_PREFIX}${bcrypted}`;
}

export async function verifyPassword(
  plain: string,
  stored: string,
): Promise<boolean> {
  if (stored.startsWith(PASSWORD_VERSION_PREFIX)) {
    const sha256 = createHash('sha256')
      .update(plain, 'utf-8')
      .digest('base64');
    return bcrypt.compare(sha256, stored.slice(PASSWORD_VERSION_PREFIX.length));
  }
  // Legacy bcrypt-only hash. Still safe to compare, but the 72-byte
  // truncation caveat applies until the user re-authenticates and the
  // stored hash is upgraded.
  return bcrypt.compare(plain, stored);
}

/**
 * True when `stored` was hashed under an older scheme and should be re-hashed
 * after a successful authentication.
 */
export function needsRehash(stored: string): boolean {
  return !stored.startsWith(PASSWORD_VERSION_PREFIX);
}
