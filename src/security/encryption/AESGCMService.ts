/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * AES-256-GCM Symmetric Authenticated Encryption Service (Stage 5.2)
 * Provides cryptographically secure data encryption and decryption
 * using Node.js native crypto with NIST-compliant 96-bit IVs and 128-bit authentication tags.
 */

import crypto from 'crypto';
import { AESGCMEncryptionResult } from './EncryptionTypes';

export class AESGCMService {
  private static readonly KEY_LENGTH_BYTES = 32; // 256 bits
  private static readonly IV_LENGTH_BYTES = 12;  // 96 bits (NIST recommendation for GCM)
  private static readonly TAG_LENGTH_BYTES = 16; // 128 bits

  /**
   * Generates a cryptographically secure 256-bit Data Encryption Key (DEK).
   */
  public static generateDEK(): Buffer {
    return crypto.randomBytes(AESGCMService.KEY_LENGTH_BYTES);
  }

  /**
   * Encrypts plaintext buffer using AES-256-GCM with authenticated additional data.
   */
  public static encrypt(
    plaintext: Buffer,
    dek: Buffer,
    additionalData?: Buffer
  ): AESGCMEncryptionResult {
    if (!dek || dek.length !== AESGCMService.KEY_LENGTH_BYTES) {
      throw new Error(`AES-256-GCM Error: Key must be exactly ${AESGCMService.KEY_LENGTH_BYTES} bytes (256 bits)`);
    }

    const iv = crypto.randomBytes(AESGCMService.IV_LENGTH_BYTES);
    const cipher = crypto.createCipheriv('aes-256-gcm', dek, iv);

    if (additionalData && additionalData.length > 0) {
      cipher.setAAD(additionalData);
    }

    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
      ciphertext,
      iv,
      authTag,
    };
  }

  /**
   * Decrypts ciphertext buffer using AES-256-GCM, verifying authentication tag.
   * Throws if ciphertext or authentication tag is tampered with.
   */
  public static decrypt(
    ciphertext: Buffer,
    dek: Buffer,
    iv: Buffer,
    authTag: Buffer,
    additionalData?: Buffer
  ): Buffer {
    if (!dek || dek.length !== AESGCMService.KEY_LENGTH_BYTES) {
      throw new Error(`AES-256-GCM Error: Key must be exactly ${AESGCMService.KEY_LENGTH_BYTES} bytes`);
    }

    if (!iv || iv.length !== AESGCMService.IV_LENGTH_BYTES) {
      throw new Error(`AES-256-GCM Error: IV must be exactly ${AESGCMService.IV_LENGTH_BYTES} bytes`);
    }

    if (!authTag || authTag.length !== AESGCMService.TAG_LENGTH_BYTES) {
      throw new Error(`AES-256-GCM Error: Authentication tag must be exactly ${AESGCMService.TAG_LENGTH_BYTES} bytes`);
    }

    try {
      const decipher = crypto.createDecipheriv('aes-256-gcm', dek, iv);
      decipher.setAuthTag(authTag);

      if (additionalData && additionalData.length > 0) {
        decipher.setAAD(additionalData);
      }

      return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    } catch (err: any) {
      throw new Error(`AES-256-GCM Authentication Failed: Data was tampered with or corrupted: ${err.message}`);
    }
  }

  /**
   * Securely zeroes memory for sensitive key buffers.
   */
  public static zeroBuffer(buffer: Buffer): void {
    if (buffer && buffer.fill) {
      buffer.fill(0);
    }
  }
}
