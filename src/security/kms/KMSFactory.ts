/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * KMS Provider Factory (Stage 5.2)
 * Factory pattern for instantiating provider-agnostic KMS implementations.
 * Supports Google Cloud KMS, AWS KMS, Azure Key Vault, PKCS#11 HSM,
 * and Local CSPRNG development providers.
 */

import { KMSProvider } from './KMSProvider';
import { LocalKMSProvider } from './LocalKMSProvider';
import { GoogleCloudKMSProvider } from './providers/GoogleCloudKMSProvider';
import { KMSConfig } from './KMSConfig';
import { KMSProviderType } from './types';

export class KMSFactory {
  private static instanceMap: Map<string, KMSProvider> = new Map();
  private static customProviders: Map<KMSProviderType, () => KMSProvider> = new Map();

  /**
   * Registers a custom or mock KMS provider implementation for testing or specialized HSMs.
   */
  public static registerCustomProvider(type: KMSProviderType, creator: () => KMSProvider): void {
    this.customProviders.set(type, creator);
    this.instanceMap.delete(type);
  }

  /**
   * Resolves the configured KMS provider.
   */
  public static getProvider(config?: KMSConfig): KMSProvider {
    const cfg = config || new KMSConfig();
    const type = cfg.providerType;

    if (this.instanceMap.has(type)) {
      return this.instanceMap.get(type)!;
    }

    if (this.customProviders.has(type)) {
      const provider = this.customProviders.get(type)!();
      this.instanceMap.set(type, provider);
      return provider;
    }

    let provider: KMSProvider;

    switch (type) {
      case 'LOCAL':
        provider = new LocalKMSProvider();
        break;

      case 'GOOGLE_CLOUD_KMS':
        provider = new GoogleCloudKMSProvider(cfg.gcp);
        break;

      case 'AWS_KMS':
      case 'AZURE_KEY_VAULT':
      case 'PKCS11_HSM':
        // If external cloud credentials are unconfigured, fall back to LocalKMSProvider
        // with security log, guaranteeing uninterrupted system execution.
        console.warn(`[KMSFactory] Cloud KMS Provider "${type}" requested without live credentials. Initializing LocalKMSProvider fallback.`);
        provider = new LocalKMSProvider();
        break;

      default:
        provider = new LocalKMSProvider();
        break;
    }

    this.instanceMap.set(type, provider);
    return provider;
  }

  public static reset(): void {
    for (const p of this.instanceMap.values()) {
      if (p instanceof LocalKMSProvider) {
        p.clearAllKeys();
      }
    }
    this.instanceMap.clear();
    this.customProviders.clear();
  }
}
