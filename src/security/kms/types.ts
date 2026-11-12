/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Stage 5.2: Enterprise HSM/KMS & Cryptographic Key Management Types.
 * Complete type definitions for provider-agnostic Key Management Service (KMS),
 * Key Encryption Keys (KEKs), Data Encryption Keys (DEKs), envelope payloads,
 * rotation state machines, and access control policies.
 */

export type KMSProviderType =
  | 'LOCAL'
  | 'GOOGLE_CLOUD_KMS'
  | 'AWS_KMS'
  | 'AZURE_KEY_VAULT'
  | 'PKCS11_HSM';

export type KeyState =
  | 'ACTIVE'
  | 'PENDING_ROTATION'
  | 'DEPRECATED'
  | 'SUSPENDED'
  | 'REVOKED'
  | 'DESTROYED';

export type KeyAlgorithm = 'AES_256_GCM' | 'AES_256_KEY_WRAP' | 'RSA_4096_OAEP';

export interface KeyMetadata {
  keyId: string;
  version: number;
  provider: KMSProviderType;
  algorithm: KeyAlgorithm;
  state: KeyState;
  createdAt: string;
  rotatedAt?: string;
  expiresAt?: string;
  revokedAt?: string;
  revocationReason?: string;
  usageCount: number;
  description?: string;
}

export interface WrapKeyParams {
  keyId: string;
  version?: number;
  plaintextKey: Buffer;
  additionalAuthenticatedData?: Buffer;
}

export interface WrapKeyResult {
  keyId: string;
  version: number;
  wrappedKey: Buffer;
  iv?: Buffer;
  authTag?: Buffer;
}

export interface UnwrapKeyParams {
  keyId: string;
  version: number;
  wrappedKey: Buffer;
  iv?: Buffer;
  authTag?: Buffer;
  additionalAuthenticatedData?: Buffer;
}

export interface UnwrapKeyResult {
  plaintextKey: Buffer;
  version: number;
}

export interface RotateKeyResult {
  keyId: string;
  previousVersion: number;
  newVersion: number;
  rotatedAt: string;
}

export interface KMSAuditEvent {
  eventId: string;
  timestamp: string;
  action: 'ENCRYPT' | 'DECRYPT' | 'WRAP' | 'UNWRAP' | 'ROTATE' | 'REVOKE' | 'BACKUP' | 'RESTORE';
  keyId: string;
  version?: number;
  actorId: string;
  actorRole: string;
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
}
