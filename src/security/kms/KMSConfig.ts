/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * KMS Configuration Manager (Stage 5.2)
 * Manages configuration for provider-agnostic KMS integration.
 * Secure defaults: Default to LOCAL development provider when cloud credentials
 * are not present, preventing deployment crashes while strictly enforcing key isolation.
 */

import { KMSProviderType } from './types';

export interface CloudKMSConfig {
  projectId?: string;
  locationId?: string;
  keyRingId?: string;
  keyId?: string;
}

export interface AWSKMSConfig {
  region?: string;
  keyArn?: string;
  endpoint?: string;
}

export interface AzureKeyVaultConfig {
  vaultUrl?: string;
  keyName?: string;
}

export interface PKCS11Config {
  modulePath?: string;
  slotId?: number;
  pin?: string;
}

export interface KMSConfigOptions {
  providerType?: KMSProviderType;
  defaultKeyId?: string;
  autoRotationIntervalDays?: number;
  rotationWarningThresholdDays?: number;
  gcp?: CloudKMSConfig;
  aws?: AWSKMSConfig;
  azure?: AzureKeyVaultConfig;
  pkcs11?: PKCS11Config;
}

export class KMSConfig {
  public readonly providerType: KMSProviderType;
  public readonly defaultKeyId: string;
  public readonly autoRotationIntervalDays: number;
  public readonly rotationWarningThresholdDays: number;
  public readonly gcp: CloudKMSConfig;
  public readonly aws: AWSKMSConfig;
  public readonly azure: AzureKeyVaultConfig;
  public readonly pkcs11: PKCS11Config;

  public constructor(options?: KMSConfigOptions) {
    const envProvider = typeof process !== 'undefined' ? (process.env.KMS_PROVIDER as KMSProviderType) : undefined;
    this.providerType = options?.providerType || envProvider || 'LOCAL';
    this.defaultKeyId = options?.defaultKeyId || (typeof process !== 'undefined' ? process.env.KMS_DEFAULT_KEY_ID || 'prism-master-kek' : 'prism-master-kek');
    this.autoRotationIntervalDays = options?.autoRotationIntervalDays || 90;
    this.rotationWarningThresholdDays = options?.rotationWarningThresholdDays || 14;

    this.gcp = options?.gcp || {
      projectId: typeof process !== 'undefined' ? process.env.GCP_PROJECT_ID || 'ais-asia-east1-0c8ec1ba1703435' : 'ais-asia-east1-0c8ec1ba1703435',
      locationId: typeof process !== 'undefined' ? process.env.GCP_KMS_LOCATION || 'global' : 'global',
      keyRingId: typeof process !== 'undefined' ? process.env.GCP_KMS_KEYRING || 'prism-keyring' : 'prism-keyring',
      keyId: typeof process !== 'undefined' ? process.env.GCP_KMS_KEY_ID || 'prism-kek' : 'prism-kek',
    };

    this.aws = options?.aws || {
      region: typeof process !== 'undefined' ? process.env.AWS_REGION || 'us-east-1' : 'us-east-1',
      keyArn: typeof process !== 'undefined' ? process.env.AWS_KMS_KEY_ARN : undefined,
    };

    this.azure = options?.azure || {
      vaultUrl: typeof process !== 'undefined' ? process.env.AZURE_KEYVAULT_URL : undefined,
      keyName: typeof process !== 'undefined' ? process.env.AZURE_KMS_KEY_NAME || 'prism-kek' : 'prism-kek',
    };

    this.pkcs11 = options?.pkcs11 || {
      modulePath: typeof process !== 'undefined' ? process.env.PKCS11_MODULE_PATH : undefined,
      slotId: typeof process !== 'undefined' ? Number(process.env.PKCS11_SLOT_ID) || 0 : 0,
    };
  }
}
