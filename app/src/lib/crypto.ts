/**
 * Application-level encryption for sensitive data
 * Uses AES-256-GCM with random IVs for each encryption
 * 
 * Key is stored in ENCRYPTION_KEY env var, never in the database.
 * Even with full DB access, encrypted data is unreadable without the key.
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16

/**
 * Get the encryption key from environment
 * Derives a 32-byte key from the env var using SHA-256
 */
function getKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY
  if (!envKey) {
    throw new Error('ENCRYPTION_KEY environment variable is required')
  }
  // Derive a 32-byte key using SHA-256
  return createHash('sha256').update(envKey).digest()
}

/**
 * Encrypt plaintext data
 * Returns base64-encoded string: IV + AuthTag + Ciphertext
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) return plaintext
  
  const key = getKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  
  let encrypted = cipher.update(plaintext, 'utf8', 'base64')
  encrypted += cipher.final('base64')
  
  const authTag = cipher.getAuthTag()
  
  // Combine: IV (16) + AuthTag (16) + Ciphertext
  const combined = Buffer.concat([
    iv,
    authTag,
    Buffer.from(encrypted, 'base64')
  ])
  
  return combined.toString('base64')
}

/**
 * Decrypt ciphertext data
 * Expects base64-encoded string: IV + AuthTag + Ciphertext
 */
export function decrypt(ciphertext: string): string {
  if (!ciphertext) return ciphertext

  // If the value isn't encrypted (e.g. legacy plaintext), return as-is
  if (!isEncrypted(ciphertext)) {
    return ciphertext
  }

  try {
    const key = getKey()
    const combined = Buffer.from(ciphertext, 'base64')

    // Extract: IV (16) + AuthTag (16) + Ciphertext
    const iv = combined.subarray(0, IV_LENGTH)
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
    const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encrypted)
    decrypted = Buffer.concat([decrypted, decipher.final()])

    return decrypted.toString('utf8')
  } catch (error) {
    // Decryption failed - do not return raw ciphertext as it could leak encrypted data
    console.error('Decryption failed:', error instanceof Error ? error.message : 'unknown error')
    return '[decryption error]'
  }
}

/**
 * Check if a value appears to be encrypted
 * Encrypted values are strict base64, round-trip cleanly, and are
 * at least IV + AuthTag + 1 byte long when decoded.
 */
export function isEncrypted(value: string): boolean {
  if (!value) return false
  try {
    // Strict base64: only valid chars, no whitespace, proper padding
    if (!/^[A-Za-z0-9+/]+=*$/.test(value)) return false
    const decoded = Buffer.from(value, 'base64')
    // Round-trip must match (filters out plaintext that Buffer.from tolerates)
    if (decoded.toString('base64') !== value) return false
    // Must be at least IV + AuthTag + 1 byte of data
    return decoded.length > IV_LENGTH + AUTH_TAG_LENGTH
  } catch {
    return false
  }
}

/**
 * Encrypt an object's specified fields
 */
export function encryptFields<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[]
): T {
  const result = { ...obj }
  for (const field of fields) {
    if (result[field] && typeof result[field] === 'string') {
      result[field] = encrypt(result[field]) as T[keyof T]
    }
  }
  return result
}

/**
 * Decrypt an object's specified fields
 */
export function decryptFields<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[]
): T {
  if (!obj) return obj
  const result = { ...obj }
  for (const field of fields) {
    if (result[field] && typeof result[field] === 'string') {
      result[field] = decrypt(result[field]) as T[keyof T]
    }
  }
  return result
}

/**
 * Encrypt array field (like backup codes)
 */
export function encryptArray(arr: string[]): string[] {
  if (!arr) return arr
  return arr.map(item => encrypt(item))
}

/**
 * Decrypt array field
 */
export function decryptArray(arr: string[]): string[] {
  if (!arr) return arr
  return arr.map(item => decrypt(item))
}
