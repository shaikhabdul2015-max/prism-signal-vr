/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Stage 5.3: Autonomous Threat Mitigation — Emergency Kill Switch
 * Safety mechanism that immediately disengages all autonomous mitigations.
 * Resetting requires dual-operator authorization.
 */

import { DistributedEventBus } from '../../engines/DistributedEventBus';
import { EnterpriseObservabilityManager } from '../../engines/EnterpriseObservabilityManager';

export class EmergencyKillSwitch {
  private static instance: EmergencyKillSwitch | null = null;
  private isEngaged = false;
  private engagedAt?: string;
  private engagedBy?: string;
  private engageReason?: string;

  private constructor() {}

  public static getInstance(): EmergencyKillSwitch {
    if (!EmergencyKillSwitch.instance) {
      EmergencyKillSwitch.instance = new EmergencyKillSwitch();
    }
    return EmergencyKillSwitch.instance;
  }

  public static resetInstance(): void {
    if (EmergencyKillSwitch.instance) {
      EmergencyKillSwitch.instance.isEngaged = false;
    }
    EmergencyKillSwitch.instance = null;
  }

  public isKillSwitchActive(): boolean {
    return this.isEngaged;
  }

  /**
   * Immediately disengages all autonomous mitigations across the system.
   */
  public engage(operatorId: string, reason: string): { success: boolean; engagedAt: string } {
    this.isEngaged = true;
    this.engagedAt = new Date().toISOString();
    this.engagedBy = operatorId;
    this.engageReason = reason;

    try {
      const eventBus = DistributedEventBus.getInstance();
      eventBus.publish({
        eventType: 'SECURITY_EVENT' as any,
        source: 'EmergencyKillSwitch',
        priority: 'CRITICAL',
        payload: {
          action: 'KILL_SWITCH_ENGAGED',
          engagedBy: operatorId,
          reason,
          timestamp: this.engagedAt,
        },
        suppressionFingerprint: `kill_switch_engaged_${Date.now()}`,
      });
    } catch {
      // Non-blocking
    }

    try {
      const obs = EnterpriseObservabilityManager.getInstance();
      obs.log({
        level: 'ERROR',
        service: 'EmergencyKillSwitch',
        message: `EMERGENCY KILL SWITCH ENGAGED by ${operatorId}: ${reason}. All autonomous responses frozen.`,
        metadata: { operatorId, reason },
      });
    } catch {
      // Non-blocking
    }

    return { success: true, engagedAt: this.engagedAt };
  }

  /**
   * Disengages the kill switch and re-enables autonomous mitigations.
   * Requires dual-operator authorization for safety.
   */
  public disengage(primaryOperatorId: string, secondaryOperatorId: string, reason: string): boolean {
    if (!primaryOperatorId || !secondaryOperatorId || primaryOperatorId === secondaryOperatorId) {
      throw new Error('Kill switch reset requires dual distinct operator authorization');
    }

    this.isEngaged = false;
    const disengagedAt = new Date().toISOString();

    try {
      const obs = EnterpriseObservabilityManager.getInstance();
      obs.log({
        level: 'INFO',
        service: 'EmergencyKillSwitch',
        message: `EMERGENCY KILL SWITCH DISENGAGED by [${primaryOperatorId}, ${secondaryOperatorId}]: ${reason}`,
        metadata: { primaryOperatorId, secondaryOperatorId, reason, disengagedAt },
      });
    } catch {
      // Non-blocking
    }

    return true;
  }

  public getStatus(): {
    isEngaged: boolean;
    engagedAt?: string;
    engagedBy?: string;
    engageReason?: string;
  } {
    return {
      isEngaged: this.isEngaged,
      engagedAt: this.engagedAt,
      engagedBy: this.engagedBy,
      engageReason: this.engageReason,
    };
  }
}
