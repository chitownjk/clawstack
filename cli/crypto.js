/**
 * Encryption helpers for CLI
 * Mirrors app/src/lib/crypto.ts for Node.js CLI usage
 */

const crypto = require('crypto')

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16

/**
 * Get the encryption key from environment
 */
function getKey() {
  const envKey = process.env.ENCRYPTION_KEY
  if (!envKey) {
    throw new Error('ENCRYPTION_KEY environment variable is required')
  }
  return crypto.createHash('sha256').update(envKey).digest()
}

/**
 * Encrypt plaintext data
 */
function encrypt(plaintext) {
  if (!plaintext) return plaintext
  
  const key = getKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  
  let encrypted = cipher.update(plaintext, 'utf8', 'base64')
  encrypted += cipher.final('base64')
  
  const authTag = cipher.getAuthTag()
  
  const combined = Buffer.concat([
    iv,
    authTag,
    Buffer.from(encrypted, 'base64')
  ])
  
  return combined.toString('base64')
}

/**
 * Decrypt ciphertext data
 */
function decrypt(ciphertext) {
  if (!ciphertext) return ciphertext
  
  try {
    const key = getKey()
    const combined = Buffer.from(ciphertext, 'base64')
    
    const iv = combined.subarray(0, IV_LENGTH)
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
    const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH)
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)
    
    let decrypted = decipher.update(encrypted)
    decrypted = Buffer.concat([decrypted, decipher.final()])
    
    return decrypted.toString('utf8')
  } catch (error) {
    // If decryption fails, may be unencrypted legacy data
    return ciphertext
  }
}

/**
 * Check if a value appears to be encrypted
 */
function isEncrypted(value) {
  if (!value) return false
  try {
    const decoded = Buffer.from(value, 'base64')
    return decoded.length > IV_LENGTH + AUTH_TAG_LENGTH
  } catch {
    return false
  }
}

module.exports = { encrypt, decrypt, isEncrypted }
