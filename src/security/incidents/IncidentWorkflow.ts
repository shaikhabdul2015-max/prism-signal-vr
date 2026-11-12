/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Stage 5.3: Autonomous Threat Mitigation — Incident Workflow State Machine
 */

export type IncidentStatus =
  | 'DETECTED'
  | 'INVESTIGATING'
  | 'CONTAINED'
  | 'REMEDIATED'
  | 'CLOSED';

export class IncidentWorkflow {
  private static readonly VALID_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
    DETECTED: ['INVESTIGATING', 'CONTAINED', 'CLOSED'],
    INVESTIGATING: ['CONTAINED', 'CLOSED'],
    CONTAINED: ['REMEDIATED', 'INVESTIGATING'],
    REMEDIATED: ['CLOSED', 'INVESTIGATING'],
    CLOSED: ['INVESTIGATING'], // Re-open if regression occurs
  };

  public static canTransition(current: IncidentStatus, target: IncidentStatus): boolean {
    if (current === target) return true;
    const allowed = this.VALID_TRANSITIONS[current] || [];
    return allowed.includes(target);
  }
}
