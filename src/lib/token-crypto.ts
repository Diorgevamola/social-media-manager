import crypto from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const TAG_LENGTH = 16

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY
  if (!hex || hex.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be 64 hex chars (32 bytes). Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"')
  }
  return Buffer.from(hex, 'hex')
}

/**
 * Criptografa um token usando AES-256-GCM.
 * Retorna string no formato "enc_v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>".
 */
export function encryptToken(plaintext: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH })
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `enc_v1:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}

/**
 * Descriptografa um token.
 * - Se começar com "enc_v1:" → descriptografa com AES-256-GCM.
 * - Caso contrário, retorna o valor como está (compatibilidade com tokens legados em plaintext).
 */
export function decryptToken(stored: string): string {
  if (!stored.startsWith('enc_v1:')) {
    // Token legado (plaintext) — retorna diretamente para manter compatibilidade
    return stored
  }
  const parts = stored.split(':')
  if (parts.length !== 4) {
    throw new Error('Token criptografado com formato inválido')
  }
  const [, ivHex, tagHex, cipherHex] = parts
  const key = getKey()
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(ivHex, 'hex'),
    { authTagLength: TAG_LENGTH },
  )
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  return (
    decipher.update(Buffer.from(cipherHex, 'hex'), undefined, 'utf8') +
    decipher.final('utf8')
  )
}
