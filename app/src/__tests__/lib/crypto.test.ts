import {
  encrypt,
  decrypt,
  isEncrypted,
  encryptFields,
  decryptFields,
  encryptArray,
  decryptArray,
} from '@/lib/crypto'

const TEST_KEY = 'test-encryption-key-for-jest-tests'

beforeAll(() => {
  process.env.ENCRYPTION_KEY = TEST_KEY
})

afterAll(() => {
  delete process.env.ENCRYPTION_KEY
})

describe('encrypt / decrypt round-trips', () => {
  it('encrypts and decrypts a simple string', () => {
    const plaintext = 'Hello, World!'
    const ciphertext = encrypt(plaintext)
    expect(ciphertext).not.toBe(plaintext)
    expect(decrypt(ciphertext)).toBe(plaintext)
  })

  it('produces different ciphertexts for the same input (random IV)', () => {
    const plaintext = 'same input'
    const c1 = encrypt(plaintext)
    const c2 = encrypt(plaintext)
    expect(c1).not.toBe(c2)
    expect(decrypt(c1)).toBe(plaintext)
    expect(decrypt(c2)).toBe(plaintext)
  })

  it('round-trips unicode and special characters', () => {
    const inputs = [
      'café résumé naïve',
      '日本語テスト',
      'email+tag@example.com',
      'token: eyJhbGciOiJIUzI1NiJ9.payload.sig',
    ]
    for (const input of inputs) {
      expect(decrypt(encrypt(input))).toBe(input)
    }
  })

  it('returns empty string unchanged', () => {
    expect(encrypt('')).toBe('')
    expect(decrypt('')).toBe('')
  })

  it('returns plaintext unchanged if not encrypted format', () => {
    const plaintext = 'not encrypted'
    expect(decrypt(plaintext)).toBe(plaintext)
  })

  it('returns [decryption error] for tampered ciphertext', () => {
    const ciphertext = encrypt('secret')
    // Flip a byte in the middle of the ciphertext
    const buf = Buffer.from(ciphertext, 'base64')
    buf[20] ^= 0xff
    const tampered = buf.toString('base64')
    expect(decrypt(tampered)).toBe('[decryption error]')
  })

  it('throws when ENCRYPTION_KEY is missing', () => {
    delete process.env.ENCRYPTION_KEY
    expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY environment variable is required')
    process.env.ENCRYPTION_KEY = TEST_KEY
  })
})

describe('isEncrypted', () => {
  it('returns true for encrypted values', () => {
    expect(isEncrypted(encrypt('some data'))).toBe(true)
  })

  it('returns false for plaintext strings', () => {
    expect(isEncrypted('hello world')).toBe(false)
    expect(isEncrypted('not-base64!')).toBe(false)
    expect(isEncrypted('')).toBe(false)
  })

  it('returns false for short base64 (below IV+AuthTag+1 threshold)', () => {
    // 32 bytes decoded = only IV + AuthTag, no data
    const short = Buffer.alloc(32).toString('base64')
    expect(isEncrypted(short)).toBe(false)
  })

  it('returns false for base64 that does not round-trip cleanly', () => {
    // Base64 with padding issues
    expect(isEncrypted('abc')).toBe(false)
  })
})

describe('encryptFields / decryptFields', () => {
  it('encrypts and decrypts specified object fields', () => {
    const obj = { name: 'Alice', email: 'alice@example.com', age: 30 }
    const encrypted = encryptFields(obj, ['email'])
    expect(encrypted.name).toBe('Alice')
    expect(encrypted.email).not.toBe('alice@example.com')
    expect(encrypted.age).toBe(30)

    const decrypted = decryptFields(encrypted, ['email'])
    expect(decrypted.email).toBe('alice@example.com')
  })

  it('skips null/undefined fields', () => {
    const obj = { name: 'Bob', email: null as unknown as string }
    const result = encryptFields(obj, ['email'])
    expect(result.email).toBeNull()
  })

  it('decryptFields returns obj unchanged if falsy', () => {
    expect(decryptFields(null as unknown as Record<string, string>, ['x'])).toBeNull()
  })
})

describe('encryptArray / decryptArray', () => {
  it('encrypts and decrypts an array of strings', () => {
    const arr = ['backup-code-1', 'backup-code-2', 'backup-code-3']
    const encrypted = encryptArray(arr)
    expect(encrypted).toHaveLength(3)
    encrypted.forEach(v => expect(isEncrypted(v)).toBe(true))

    const decrypted = decryptArray(encrypted)
    expect(decrypted).toEqual(arr)
  })

  it('returns input unchanged if falsy', () => {
    expect(encryptArray(null as unknown as string[])).toBeNull()
    expect(decryptArray(null as unknown as string[])).toBeNull()
  })
})
