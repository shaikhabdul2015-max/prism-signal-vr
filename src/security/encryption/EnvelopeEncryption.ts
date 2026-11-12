/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Envelope Encryption Coordinator (Stage 5.2)
 * Coordinates KMS Key Encryption Key (KEK) wrapping and AES-256-GCM Data Encryption Keys (DEKs).
 * 
 * Guarantees:
 * 1. Plaintext data is encrypted using unique, single-use 256-bit DEKs.
 * 2. DEKs are wrapped using the configured KMS KEK and stored alongside the ciphertext.
 * 3. Authentication tags and IVs are cryptographically validated during decryption.
 * 4. Plaintext DEK buffers are immediately zeroed in memory after use.
 * 5. Supports seamless re-encryption from deprecated key versions to active key versions.
 */

import { KMSFactory } from '../kms/KMSFactory';
import { KMSProvider } from '../kms/KMSProvider';
import { KMSConfig } from '../kms/KMSConfig';
import { AESGCMService } from './AESGCMService';
import {
  DecryptionResult,
  DecryptOptions,
  EncryptedEnvelope,
  EncryptOptions,
} from './EncryptionTypes';

export class EnvelopeEncryption {
  private static instance: EnvelopeEncryption | null = null;
  private kmsProvider: KMSProvider;
  private defaultKeyId: string;

  private constructor(kmsProvider?: KMSProvider, defaultKeyId?: string) {
    const config = new KMSConfig();
    this.kmsProvider = kmsProvider || KMSFactory.getProvider(config);
    this.defaultKeyId = defaultKeyId || config.defaultKeyId;
  }

  public static getInstance(kmsProvider?: KMSProvider, defaultKeyId?: string): EnvelopeEncryption {
    if (!EnvelopeEncryption.instance) {
      EnvelopeEncryption.instance = new EnvelopeEncryption(kmsProvider, defaultKeyId);
    }
    return EnvelopeEncryption.instance;
  }

  public static resetInstance(): void {
    EnvelopeEncryption.instance = null;
  }

  /**
   * Encrypts plaintext using a single-use 256-bit DEK wrapped by KMS KEK.
   */
  public async encrypt(
    data: Buffer | string,
    options?: EncryptOptions
  ): Promise<EncryptedEnvelope> {
    const keyId = options?.keyId || this.defaultKeyId;
    const plaintextBuffer = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
    const aadBuffer = options?.additionalData ? Buffer.from(options.additionalData, 'utf8') : undefined;

    // 1. Generate unique 256-bit DEK
    const dek = AESGCMService.generateDEK();

    try {
      // 2. Encrypt plaintext with DEK using AES-256-GCM
      const encryptionResult = AESGCMService.encrypt(plaintextBuffer, dek, aadBuffer);

      // 3. Wrap DEK with KMS KEK
      const wrapResult = await this.kmsProvider.wrapKey({
        keyId,
        version: options?.keyVersion,
        plaintextKey: dek,
        additionalAuthenticatedData: aadBuffer,
      });

      // 4. Build authenticated envelope
      const envelope: EncryptedEnvelope = {
        schemaVersion: 1,
        algorithm: 'AES_256_GCM',
        kekKeyId: wrapResult.keyId,
        kekVersion: wrapResult.version,
        wrappedDek: wrapResult.wrappedKey.toString('base64'),
        wrappedDekIv: wrapResult.iv ? wrapResult.iv.toString('base64') : '',
        wrappedDekAuthTag: wrapResult.authTag ? wrapResult.authTag.toString('base64') : '',
        ciphertext: encryptionResult.ciphertext.toString('base64'),
        iv: encryptionResult.iv.toString('base64'),
        authTag: encryptionResult.authTag.toString('base64'),
        additionalData: options?.additionalData,
        createdAt: new Date().toISOString(),
      };

      return envelope;
    } finally {
      // Securely zero out plaintext DEK buffer
      AESGCMService.zeroBuffer(dek);
    }
  }

  /**
   * Decrypts an encrypted envelope by unwrapping the DEK through KMS and verifying the GCM tag.
   */
  public async decrypt(
    envelope: EncryptedEnvelope,
    options?: DecryptOptions
  ): Promise<DecryptionResult> {
    if (!envelope || envelope.schemaVersion !== 1 || envelope.algorithm !== 'AES_256_GCM') {
      throw new Error('Envelope Decryption Error: Invalid or unsupported envelope schema');
    }

    if (options?.expectedKeyId && envelope.kekKeyId !== options.expectedKeyId) {
      throw new Error(`Envelope Decryption Error: Key mismatch (expected "${options.expectedKeyId}", got "${envelope.kekKeyId}")`);
    }

    const wrappedDekBuffer = Buffer.from(envelope.wrappedDek, 'base64');
    const wrappedDekIv = envelope.wrappedDekIv ? Buffer.from(envelope.wrappedDekIv, 'base64') : undefined;
    const wrappedDekAuthTag = envelope.wrappedDekAuthTag ? Buffer.from(envelope.wrappedDekAuthTag, 'base64') : undefined;
    const ciphertextBuffer = Buffer.from(envelope.ciphertext, 'base64');
    const ivBuffer = Buffer.from(envelope.iv, 'base64');
    const authTagBuffer = Buffer.from(envelope.authTag, 'base64');
    const aadBuffer = envelope.additionalData ? Buffer.from(envelope.additionalData, 'utf8') : undefined;

    // 1. Unwrap DEK with KMS
    const unwrapResult = await this.kmsProvider.unwrapKey({
      keyId: envelope.kekKeyId,
      version: envelope.kekVersion,
      wrappedKey: wrappedDekBuffer,
      iv: wrappedDekIv,
      authTag: wrappedDekAuthTag,
      additionalAuthenticatedData: aadBuffer,
    });

    const dek = unwrapResult.plaintextKey;

    try {
      // 2. Decrypt ciphertext and verify authentication tag
      const plaintext = AESGCMService.decrypt(
        ciphertextBuffer,
        dek,
        ivBuffer,
        authTagBuffer,
        aadBuffer
      );

      return {
        plaintext,
        plaintextUtf8: plaintext.toString('utf8'),
        kekKeyId: envelope.kekKeyId,
        kekVersion: unwrapResult.version,
        decryptedAt: new Date().toISOString(),
      };
    } finally {
      // Securely zero out unwrapped DEK buffer
      AESGCMService.zeroBuffer(dek);
    }
  }

  /**
   * Safely re-encrypts data from a deprecated key version to the target or active key version.
   */
  public async reencrypt(
    envelope: EncryptedEnvelope,
    targetKeyVersion?: number
  ): Promise<EncryptedEnvelope> {
    // 1. Decrypt using historical key version
    const decrypted = await this.decrypt(envelope);

    // 2. Encrypt under new key version
    return this.encrypt(decrypted.plaintext, {
      keyId: envelope.kekKeyId,
      keyVersion: targetKeyVersion,
      additionalData: envelope.additionalData,
    });
  }
}

export const envelopeEncryption = EnvelopeEncryption.getInstance();
