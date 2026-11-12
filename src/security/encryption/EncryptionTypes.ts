/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Envelope Encryption Type Definitions (Stage 5.2)
 * Cryptographic structures for AES-256-GCM envelope encryption,
 * wrapped Data Encryption Keys (DEKs), authentication tags,
 * and key version metadata.
 */

export interface EncryptedEnvelope {
  schemaVersion: number;
  algorithm: 'AES_256_GCM';
  kekKeyId: string;
  kekVersion: number;
  wrappedDek: string;       // Base64-encoded wrapped DEK
  wrappedDekIv: string;     // Base64-encoded IV used for KEK wrap
  wrappedDekAuthTag: string;// Base64-encoded AuthTag used for KEK wrap
  ciphertext: string;       // Base64-encoded AES-256-GCM encrypted data
  iv: string;               // Base64-encoded 96-bit IV for data
  authTag: string;          // Base64-encoded 128-bit GCM authentication tag
  additionalData?: string;  // Optional authenticated data (AAD)
  createdAt: string;
}

export interface EncryptOptions {
  keyId?: string;
  keyVersion?: number;
  additionalData?: string;
  actorId?: string;
  actorRole?: string;
}

export interface DecryptOptions {
  expectedKeyId?: string;
  actorId?: string;
  actorRole?: string;
}

export interface DecryptionResult {
  plaintext: Buffer;
  plaintextUtf8: string;
  kekKeyId: string;
  kekVersion: number;
  decryptedAt: string;
}

export interface AESGCMEncryptionResult {
  ciphertext: Buffer;
  iv: Buffer;
  authTag: Buffer;
}
