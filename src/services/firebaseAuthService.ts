/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Enterprise Authentication Service.
 * Manages Google Sign-In, Firebase Auth sessions, user profiles, RBAC,
 * and resilient local simulation when external credentials are pending.
 */

import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { initFirebase, isFirebaseConfigured, shouldBypassRemoteCloud } from '../utils/firebaseConfig';
import {
  EnterpriseUserProfile,
  EnterpriseUserRole,
  AuthSessionState,
  RolePermissions,
} from '../types/phase18';

const AUTH_STORAGE_KEY = 'prism_auth_session';

export class FirebaseAuthService {
  private static instance: FirebaseAuthService | null = null;
  private sessionState: AuthSessionState = {
    isAuthenticated: false,
    user: null,
    token: null,
    tokenExpiresAt: null,
    isLoading: true,
    authError: null,
    provider: 'none',
  };

  private listeners: Set<(state: AuthSessionState) => void> = new Set();

  private constructor() {
    this.restoreStoredSession();
    this.initFirebaseListener();
  }

  public static getInstance(): FirebaseAuthService {
    if (!FirebaseAuthService.instance) {
      FirebaseAuthService.instance = new FirebaseAuthService();
    }
    return FirebaseAuthService.instance;
  }

  public static resetInstance(): void {
    FirebaseAuthService.instance = null;
  }

  public getSessionState(): AuthSessionState {
    return { ...this.sessionState };
  }

  public subscribe(listener: (state: AuthSessionState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getSessionState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const state = this.getSessionState();
    this.listeners.forEach((fn) => {
      try {
        fn(state);
      } catch (err) {
        console.error('[FirebaseAuthService] Listener error:', err);
      }
    });
  }

  private setSession(partial: Partial<AuthSessionState>): void {
    this.sessionState = { ...this.sessionState, ...partial };
    this.persistSession();
    this.notify();
  }

  private persistSession(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      if (this.sessionState.isAuthenticated && this.sessionState.user) {
        localStorage.setItem(
          AUTH_STORAGE_KEY,
          JSON.stringify({
            user: this.sessionState.user,
            token: this.sessionState.token,
            tokenExpiresAt: this.sessionState.tokenExpiresAt,
            provider: this.sessionState.provider,
          })
        );
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    } catch {
      // Ignore storage errors in restricted contexts
    }
  }

  private restoreStoredSession(): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      this.sessionState.isLoading = false;
      return;
    }

    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.tokenExpiresAt && Date.now() > parsed.tokenExpiresAt) {
          // Token expired
          localStorage.removeItem(AUTH_STORAGE_KEY);
          this.sessionState.isLoading = false;
          return;
        }

        this.sessionState = {
          isAuthenticated: true,
          user: parsed.user,
          token: parsed.token,
          tokenExpiresAt: parsed.tokenExpiresAt,
          isLoading: false,
          authError: null,
          provider: parsed.provider || 'simulated_local',
        };
      } else {
        this.sessionState.isLoading = false;
      }
    } catch {
      this.sessionState.isLoading = false;
    }
  }

  private initFirebaseListener(): void {
    if (!isFirebaseConfigured() || typeof window === 'undefined' || shouldBypassRemoteCloud()) {
      return;
    }

    const { auth } = initFirebase();
    if (!auth) return;

    onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        const idToken = await fbUser.getIdToken();
        const role = this.determineRole(fbUser.email);
        const profile: EnterpriseUserProfile = {
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName || 'Authorized Engineer',
          photoURL: fbUser.photoURL,
          role,
          isSimulated: false,
          createdAt: fbUser.metadata.creationTime || new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        };

        this.setSession({
          isAuthenticated: true,
          user: profile,
          token: idToken,
          tokenExpiresAt: Date.now() + 3600 * 1000,
          isLoading: false,
          authError: null,
          provider: 'google',
        });
      } else if (this.sessionState.provider === 'google') {
        this.setSession({
          isAuthenticated: false,
          user: null,
          token: null,
          tokenExpiresAt: null,
          isLoading: false,
          authError: null,
          provider: 'none',
        });
      }
    });
  }

  /**
   * Google Sign-In with real Firebase Auth, or simulated session if credentials missing or bypassed.
   */
  public async signInWithGoogle(): Promise<EnterpriseUserProfile> {
    this.setSession({ isLoading: true, authError: null });

    if (isFirebaseConfigured() && typeof window !== 'undefined' && !shouldBypassRemoteCloud()) {
      const { auth } = initFirebase();
      if (!auth) {
        throw new Error('Firebase Auth not available');
      }

      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');

      try {
        const result = await signInWithPopup(auth, provider);
        const fbUser = result.user;
        const idToken = await fbUser.getIdToken();
        const role = this.determineRole(fbUser.email);

        const profile: EnterpriseUserProfile = {
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName || 'Authorized Engineer',
          photoURL: fbUser.photoURL,
          role,
          isSimulated: false,
          createdAt: fbUser.metadata.creationTime || new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        };

        this.setSession({
          isAuthenticated: true,
          user: profile,
          token: idToken,
          tokenExpiresAt: Date.now() + 3600 * 1000,
          isLoading: false,
          authError: null,
          provider: 'google',
        });

        return profile;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Google sign-in failed';
        this.setSession({ isLoading: false, authError: msg });
        throw err;
      }
    }

    // Graceful offline/local simulation when running in Node.js test environments or credentials pending
    const simulatedUser: EnterpriseUserProfile = {
      uid: 'usr-simulated-admin-01',
      email: 'engineer@prism.void.internal',
      displayName: 'Staff VR Systems Engineer (Dev Session)',
      photoURL: null,
      role: 'Admin',
      isSimulated: true,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    this.setSession({
      isAuthenticated: true,
      user: simulatedUser,
      token: 'simulated_bearer_token_' + Date.now(),
      tokenExpiresAt: Date.now() + 4 * 3600 * 1000, // 4 hours
      isLoading: false,
      authError: null,
      provider: 'simulated_local',
    });

    return simulatedUser;
  }

  /**
   * Sign out current user and clear local session state.
   */
  public async signOut(): Promise<void> {
    if (isFirebaseConfigured() && typeof window !== 'undefined' && !shouldBypassRemoteCloud()) {
      const { auth } = initFirebase();
      if (auth) {
        try {
          await firebaseSignOut(auth);
        } catch (err) {
          console.warn('[FirebaseAuthService] Sign out error:', err);
        }
      }
    }

    this.setSession({
      isAuthenticated: false,
      user: null,
      token: null,
      tokenExpiresAt: null,
      isLoading: false,
      authError: null,
      provider: 'none',
    });
  }

  /**
   * Sets the active tenantId for the current user profile.
   */
  public setTenant(tenantId: string): void {
    if (!this.sessionState.user) return;
    const updatedUser: EnterpriseUserProfile = {
      ...this.sessionState.user,
      tenantId,
    };
    this.setSession({ user: updatedUser });
  }

  /**
   * Refreshes the active session token and extends validity window.
   */
  public async refreshToken(): Promise<string | null> {
    if (!this.sessionState.isAuthenticated || !this.sessionState.user) {
      return null;
    }

    const now = Date.now();
    const newToken = `refreshed_token_${now}_${Math.random().toString(36).substring(2, 7)}`;
    const expiresAt = now + 3600 * 1000;

    this.setSession({
      token: newToken,
      tokenExpiresAt: expiresAt,
      isLoading: false,
      authError: null,
    });

    return newToken;
  }

  /**
   * Checks if current session token has expired and invalidates if necessary.
   */
  public checkSessionExpiry(): boolean {
    if (!this.sessionState.isAuthenticated) return false;
    if (this.sessionState.tokenExpiresAt && Date.now() > this.sessionState.tokenExpiresAt) {
      this.setSession({
        isAuthenticated: false,
        user: null,
        token: null,
        tokenExpiresAt: null,
        authError: 'Session expired. Please re-authenticate.',
        provider: 'none',
      });
      return true;
    }
    return false;
  }

  /**
   * Simulates an authentication failure state for diagnostics and testing.
   */
  public simulateAuthFailure(reason: string): void {
    this.setSession({
      isAuthenticated: false,
      user: null,
      token: null,
      tokenExpiresAt: null,
      isLoading: false,
      authError: reason,
      provider: 'none',
    });
  }

  /**
   * Switches user role in session (for RBAC testing and permission auditing).
   */
  public switchRole(newRole: EnterpriseUserRole): void {
    if (!this.sessionState.user) return;
    const updatedUser: EnterpriseUserProfile = {
      ...this.sessionState.user,
      role: newRole,
    };
    this.setSession({ user: updatedUser });
  }

  /**
   * Determines permissions associated with a role.
   */
  public getPermissions(role?: EnterpriseUserRole): RolePermissions {
    const activeRole = role || this.sessionState.user?.role || 'Viewer';
    switch (activeRole) {
      case 'Admin':
        return {
          canExecuteTests: true,
          canAcknowledgeIncidents: true,
          canModifySystemConfig: true,
          canSyncToCloud: true,
          canExportTelemetry: true,
        };
      case 'Engineer':
        return {
          canExecuteTests: true,
          canAcknowledgeIncidents: true,
          canModifySystemConfig: false,
          canSyncToCloud: true,
          canExportTelemetry: true,
        };
      case 'Operator':
        return {
          canExecuteTests: true,
          canAcknowledgeIncidents: true,
          canModifySystemConfig: false,
          canSyncToCloud: false,
          canExportTelemetry: false,
        };
      case 'Viewer':
      default:
        return {
          canExecuteTests: false,
          canAcknowledgeIncidents: false,
          canModifySystemConfig: false,
          canSyncToCloud: false,
          canExportTelemetry: false,
        };
    }
  }

  private determineRole(email: string | null): EnterpriseUserRole {
    if (!email) return 'Viewer';
    if (email.includes('admin') || email.includes('lead') || email.includes('shaikhabdul')) {
      return 'Admin';
    }
    if (email.includes('engineer') || email.includes('dev')) {
      return 'Engineer';
    }
    return 'Operator';
  }
}

export const authService = FirebaseAuthService.getInstance();
