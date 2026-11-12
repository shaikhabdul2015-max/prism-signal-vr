/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Modular Firebase SDK Client Configuration.
 * Handles graceful initialization, credential inspection, and connection monitoring.
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

export interface FirebaseClientConfig {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  measurementId?: string;
}

// Safely retrieve environment configuration across Vite client and Node/test environments
function getEnvConfig(): FirebaseClientConfig {
  let env: Record<string, string | undefined> = {};

  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      env = import.meta.env as Record<string, string | undefined>;
    }
  } catch {
    // import.meta unavailable in plain commonjs or certain test runners
  }

  if (typeof process !== 'undefined' && process.env) {
    env = { ...env, ...process.env };
  }

  const apiKey = env.VITE_FIREBASE_API_KEY || env.FIREBASE_API_KEY;
  const projectId = env.VITE_FIREBASE_PROJECT_ID || env.FIREBASE_PROJECT_ID;
  let authDomain = env.VITE_FIREBASE_AUTH_DOMAIN || env.FIREBASE_AUTH_DOMAIN;

  // Normalize malformed or protocol-stripped authDomain values (e.g. '://firebaseapp.com')
  if (authDomain) {
    authDomain = authDomain.replace(/^[a-zA-Z]+:\/\//, '').replace(/^:\/\//, '').trim();
    if (authDomain === 'firebaseapp.com' && projectId) {
      authDomain = `${projectId}.firebaseapp.com`;
    }
  } else if (projectId) {
    authDomain = `${projectId}.firebaseapp.com`;
  }

  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || env.FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID || env.FIREBASE_APP_ID,
    measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || env.FIREBASE_MEASUREMENT_ID,
  };
}

let cachedApp: FirebaseApp | null = null;
let cachedAuth: Auth | null = null;
let cachedFirestore: Firestore | null = null;

export function getMissingFirebaseKeys(): string[] {
  const config = getEnvConfig();
  const missing: string[] = [];
  if (!config.apiKey) missing.push('VITE_FIREBASE_API_KEY');
  if (!config.projectId) missing.push('VITE_FIREBASE_PROJECT_ID');
  if (!config.authDomain) missing.push('VITE_FIREBASE_AUTH_DOMAIN');
  if (!config.appId) missing.push('VITE_FIREBASE_APP_ID');
  return missing;
}

export function shouldBypassRemoteCloud(): boolean {
  let env: Record<string, string | undefined> = {};
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      env = import.meta.env as Record<string, string | undefined>;
    }
  } catch {
    // import.meta unavailable
  }
  if (typeof process !== 'undefined' && process.env) {
    env = { ...env, ...process.env };
  }
  return env.VITE_FIREBASE_BYPASS_REMOTE === 'true' || env.FIREBASE_BYPASS_REMOTE === 'true';
}

export function isFirebaseConfigured(): boolean {
  const config = getEnvConfig();
  return Boolean(config.apiKey && config.projectId && config.apiKey.length > 5);
}

export function initFirebase(): {
  app: FirebaseApp | null;
  auth: Auth | null;
  firestore: Firestore | null;
  configured: boolean;
  missingKeys: string[];
} {
  const missingKeys = getMissingFirebaseKeys();
  if (!isFirebaseConfigured()) {
    return {
      app: null,
      auth: null,
      firestore: null,
      configured: false,
      missingKeys,
    };
  }

  // Gracefully bypass remote GCP network calls when restricted API keys are active
  if (shouldBypassRemoteCloud()) {
    return {
      app: null,
      auth: null,
      firestore: null,
      configured: true,
      missingKeys: [],
    };
  }

  if (cachedApp && cachedAuth && cachedFirestore) {
    return {
      app: cachedApp,
      auth: cachedAuth,
      firestore: cachedFirestore,
      configured: true,
      missingKeys: [],
    };
  }

  try {
    const config = getEnvConfig();
    const existingApps = getApps();
    const app = existingApps.length > 0 ? existingApps[0] : initializeApp(config);
    const auth = getAuth(app);
    const firestore = getFirestore(app);

    cachedApp = app;
    cachedAuth = auth;
    cachedFirestore = firestore;

    return {
      app,
      auth,
      firestore,
      configured: true,
      missingKeys: [],
    };
  } catch (err) {
    console.warn('[FirebaseConfig] Failed to initialize Firebase SDK:', err);
    return {
      app: null,
      auth: null,
      firestore: null,
      configured: false,
      missingKeys: ['INITIALIZATION_ERROR'],
    };
  }
}
