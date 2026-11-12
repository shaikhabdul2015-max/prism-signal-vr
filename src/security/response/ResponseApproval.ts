/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Stage 5.3: Autonomous Threat Mitigation — Response Approval Workflow
 * Governs high-impact and critical remediation actions requiring explicit human approval.
 */

export interface PendingApprovalRequest {
  id: string;
  threatId: string;
  action: string;
  target: string;
  requestedAt: string;
  expiresAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  rationale: string;
  approvedBy?: string;
  approvalNotes?: string;
}

export class ResponseApprovalManager {
  private static instance: ResponseApprovalManager | null = null;
  private requests: Map<string, PendingApprovalRequest> = new Map();

  private constructor() {}

  public static getInstance(): ResponseApprovalManager {
    if (!ResponseApprovalManager.instance) {
      ResponseApprovalManager.instance = new ResponseApprovalManager();
    }
    return ResponseApprovalManager.instance;
  }

  public static resetInstance(): void {
    if (ResponseApprovalManager.instance) {
      ResponseApprovalManager.instance.requests.clear();
    }
    ResponseApprovalManager.instance = null;
  }

  /**
   * Registers a proposed destructive or high-impact action requiring human approval.
   */
  public createApprovalRequest(
    threatId: string,
    action: string,
    target: string,
    rationale: string,
    validitySeconds = 1800
  ): PendingApprovalRequest {
    const id = `apr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = Date.now();
    const req: PendingApprovalRequest = {
      id,
      threatId,
      action,
      target,
      requestedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + validitySeconds * 1000).toISOString(),
      status: 'PENDING',
      rationale,
    };
    this.requests.set(id, req);
    return req;
  }

  public approveRequest(requestId: string, operatorId: string, notes?: string): boolean {
    const req = this.requests.get(requestId);
    if (!req) return false;
    if (req.status !== 'PENDING') return false;

    if (new Date() > new Date(req.expiresAt)) {
      req.status = 'EXPIRED';
      return false;
    }

    req.status = 'APPROVED';
    req.approvedBy = operatorId;
    req.approvalNotes = notes;
    return true;
  }

  public rejectRequest(requestId: string, operatorId: string, notes?: string): boolean {
    const req = this.requests.get(requestId);
    if (!req || req.status !== 'PENDING') return false;

    req.status = 'REJECTED';
    req.approvedBy = operatorId;
    req.approvalNotes = notes;
    return true;
  }

  public getPendingRequests(): PendingApprovalRequest[] {
    const now = new Date();
    return Array.from(this.requests.values()).filter((r) => {
      if (r.status === 'PENDING' && now > new Date(r.expiresAt)) {
        r.status = 'EXPIRED';
        return false;
      }
      return r.status === 'PENDING';
    });
  }

  public getRequest(requestId: string): PendingApprovalRequest | undefined {
    return this.requests.get(requestId);
  }
}
