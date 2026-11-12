/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Abstract KMS Provider Contract (Stage 5.2)
 * Common interface across Google Cloud KMS, AWS KMS, Azure Key Vault,
 * PKCS#11 Hardware Security Modules, and Local CSPRNG Development Providers.
 */

import {
  KeyMetadata,
  KMSProviderType,
  RotateKeyResult,
  UnwrapKeyParams,
  UnwrapKeyResult,
  WrapKeyParams,
  WrapKeyResult,
} from './types';

export abstract class KMSProvider {
  public abstract readonly providerType: KMSProviderType;

  /**
   * Wraps (encrypts) a Data Encryption Key (DEK) with the designated KEK.
   */
  public abstract wrapKey(params: WrapKeyParams): Promise<WrapKeyResult>;

  /**
   * Unwraps (decrypts) a previously wrapped Data Encryption Key (DEK).
   */
  public abstract unwrapKey(params: UnwrapKeyParams): Promise<UnwrapKeyResult>;

  /**
   * Creates a new primary key version for the given key ID, marking previous versions as DEPRECATED.
   */
  public abstract rotateKey(keyId: string): Promise<RotateKeyResult>;

  /**
   * Retrieves metadata for a specific key and version.
   */
  public abstract getKeyMetadata(keyId: string, version?: number): Promise<KeyMetadata>;

  /**
   * Revokes a specific key version due to compromise or decommission.
   */
  public abstract revokeKeyVersion(keyId: string, version: number, reason: string): Promise<void>;

  /**
   * Lists all existing versions for a specific key.
   */
  public abstract listKeyVersions(keyId: string): Promise<KeyMetadata[]>;

  /**
   * Validates KMS connectivity, token authentication, and operational readiness.
   */
  public abstract isHealthy(): Promise<boolean>;
}
