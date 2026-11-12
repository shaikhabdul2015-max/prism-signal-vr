/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Enterprise Authentication & Access Control Modal (Phase 18).
 * Manages Google Sign-In, Firebase session tokens, role-based access control,
 * and permissions matrix.
 */

import React, { useEffect, useState } from 'react';
import { authService } from '../services/firebaseAuthService';
import { AuthSessionState, EnterpriseUserRole } from '../types/phase18';
import { isFirebaseConfigured, getMissingFirebaseKeys, shouldBypassRemoteCloud } from '../utils/firebaseConfig';
import {
  Shield,
  User,
  LogOut,
  LogIn,
  Check,
  AlertCircle,
  Key,
  Lock,
  Sparkles,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const EnterpriseAuthModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [session, setSession] = useState<AuthSessionState>(() => authService.getSessionState());
  const [isSigningIn, setIsSigningIn] = useState(false);
  const isConfigured = isFirebaseConfigured();
  const isBypassed = shouldBypassRemoteCloud();
  const missingKeys = getMissingFirebaseKeys();

  useEffect(() => {
    const unsubscribe = authService.subscribe((state) => {
      setSession(state);
    });
    return unsubscribe;
  }, []);

  if (!isOpen) return null;

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await authService.signInWithGoogle();
    } catch (err) {
      console.error('Sign-in error:', err);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await authService.signOut();
  };

  const handleRoleChange = (role: EnterpriseUserRole) => {
    authService.switchRole(role);
  };

  const perms = authService.getPermissions(session.user?.role);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-100 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-400">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-mono tracking-wide text-cyan-300">
                ENTERPRISE AUTHENTICATION
              </h2>
              <p className="text-xs text-slate-400">
                Secure Session & Role-Based Access Control (RBAC)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-sm font-mono px-2 py-1"
          >
            ✕
          </button>
        </div>

        {/* Firebase Config Status Alert */}
        {!isConfigured ? (
          <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/40 text-xs text-amber-300 space-y-1.5">
            <div className="flex items-center gap-2 font-bold font-mono">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span>FIREBASE CREDENTIALS PENDING CONFIGURATION</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              External Firebase keys ({missingKeys.slice(0, 3).join(', ')}) are not yet set in environment.
              Platform is running with <strong>Enterprise Offline & Local Session Security</strong>.
            </p>
          </div>
        ) : isBypassed ? (
          <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-800/50 text-xs text-cyan-300 space-y-1 font-mono">
            <div className="flex items-center gap-2 font-bold">
              <Check className="w-4 h-4 text-cyan-400" />
              <span>GCP RESTRICTION BYPASS ACTIVE (CONFIG SAVED LOCALLY)</span>
            </div>
            <p className="text-slate-300 font-sans text-[11px] leading-relaxed">
              Firebase credentials are preserved in local environment. Active cloud connection verification is bypassed to prevent GCP API key restriction blocks. Operating in high-speed local enterprise persistence mode.
            </p>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-xs text-emerald-300 flex items-center gap-2 font-mono">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>MODULAR FIREBASE AUTH INITIALIZED & OPERATIONAL</span>
          </div>
        )}

        {/* User Session State */}
        {session.isAuthenticated && session.user ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-cyan-900/60 border border-cyan-500/40 flex items-center justify-center text-cyan-300 font-bold font-mono text-lg">
                {session.user.displayName ? session.user.displayName.charAt(0).toUpperCase() : <User />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-100 truncate">
                    {session.user.displayName}
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    {session.user.role}
                  </span>
                </div>
                <p className="text-xs text-slate-400 truncate">{session.user.email}</p>
                <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-slate-500">
                  <span>UID: {session.user.uid.slice(0, 16)}...</span>
                  {session.user.isSimulated && (
                    <span className="text-amber-400">(Local Dev Session)</span>
                  )}
                </div>
              </div>
            </div>

            {/* Role Switcher & RBAC Matrix */}
            <div>
              <label className="text-xs font-mono text-slate-400 block mb-2">
                ACTIVE USER ROLE (RBAC SIMULATION & ASSIGNMENT)
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['Admin', 'Engineer', 'Operator', 'Viewer'] as EnterpriseUserRole[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => handleRoleChange(r)}
                    className={`py-2 px-1 text-xs font-mono font-semibold rounded-lg border transition-all ${
                      session.user?.role === r
                        ? 'bg-cyan-600/30 border-cyan-400 text-cyan-200 shadow-md shadow-cyan-950/50'
                        : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Permissions Breakdown */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs font-mono space-y-1.5">
              <div className="text-slate-400 font-bold mb-1">GRANTED PERMISSIONS:</div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className={perms.canExecuteTests ? 'text-emerald-400' : 'text-slate-600'}>
                    {perms.canExecuteTests ? '✓' : '✕'}
                  </span>
                  <span>Execute VR Tests</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={perms.canAcknowledgeIncidents ? 'text-emerald-400' : 'text-slate-600'}>
                    {perms.canAcknowledgeIncidents ? '✓' : '✕'}
                  </span>
                  <span>Manage Incidents</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={perms.canSyncToCloud ? 'text-emerald-400' : 'text-slate-600'}>
                    {perms.canSyncToCloud ? '✓' : '✕'}
                  </span>
                  <span>Cloud Sync</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={perms.canModifySystemConfig ? 'text-emerald-400' : 'text-slate-600'}>
                    {perms.canModifySystemConfig ? '✓' : '✕'}
                  </span>
                  <span>System Config</span>
                </div>
              </div>
            </div>

            {/* Sign Out Button */}
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 font-mono text-xs transition-colors border border-slate-700"
            >
              <LogOut className="w-4 h-4" />
              <span>TERMINATE SESSION & SIGN OUT</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4 py-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-cyan-950/40 border border-cyan-800/40 text-cyan-400 mx-auto flex items-center justify-center">
              <Lock className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold font-mono text-slate-100">AUTHENTICATION REQUIRED</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                Sign in with your Google account to access enterprise test automation, cloud telemetry synchronization, and incident operations.
              </p>
            </div>

            <button
              onClick={handleSignIn}
              disabled={isSigningIn}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-slate-950 font-bold font-mono text-sm shadow-lg shadow-cyan-950/50 transition-all cursor-pointer"
            >
              {isSigningIn ? (
                <span>AUTHENTICATING WITH GOOGLE...</span>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>SIGN IN WITH GOOGLE</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
