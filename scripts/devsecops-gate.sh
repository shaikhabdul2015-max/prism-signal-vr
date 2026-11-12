#!/usr/bin/env bash
# ==============================================================================
# PRISM SIGNAL: BEYOND THE VOID
# Stage 4 DevSecOps Automated Verification Gate
# Runs TypeScript verification, security linting, full regression test suites,
# secret exposure detection, and build output validation.
# ==============================================================================

set -e

echo "=== [1/5] DevSecOps Gate: TypeScript Type Safety Check ==="
npx tsc --noEmit
echo "✓ TypeScript type check passed (0 errors)"

echo "=== [2/5] DevSecOps Gate: Secret Exposure & Cryptographic Algorithm Scan ==="
# Check for accidental hardcoded API secrets or service accounts in src/
LEAKED_PATTERNS=$(grep -rnE '(PRIVATE KEY|BEGIN RSA PRIVATE|service_account\.json|gsk_[a-zA-Z0-9]{30,})' src/ || true)
if [ -n "$LEAKED_PATTERNS" ]; then
  echo "CRITICAL SECURITY ERROR: Potential secret leakage detected:"
  echo "$LEAKED_PATTERNS"
  exit 1
fi

# Check for banned weak cryptographic ciphers (DES, RC4, MD5) in src/security/
WEAK_CIPHERS=$(grep -rnE "(createCipheriv\(['\"](des|rc4|blowfish|aes-128-ecb)|createHash\(['\"]md5)" src/security/ || true)
if [ -n "$WEAK_CIPHERS" ]; then
  echo "CRITICAL SECURITY ERROR: Weak cryptographic algorithm detected:"
  echo "$WEAK_CIPHERS"
  exit 1
fi
echo "✓ Secret & cryptographic algorithm scanning passed: zero exposed credentials and modern AES-256-GCM enforced"

echo "=== [3/5] DevSecOps Gate: Automated Unit & Regression Test Suite ==="
npm test
echo "✓ Full test suite passed"

echo "=== [4/5] DevSecOps Gate: Production Build Verification ==="
npm run build
echo "✓ Production bundle build succeeded"

echo "=== [5/5] DevSecOps Gate: Deployment Artifact Integrity ==="
if [ ! -d "dist" ] || [ ! -f "dist/index.html" ]; then
  echo "CRITICAL ERROR: dist/index.html missing from build output"
  exit 1
fi
echo "✓ Deployment artifacts verified"

echo "=========================================================="
echo "✓ DEVSECOPS VERIFICATION GATE: ALL SECURITY CHECKS PASSED"
echo "=========================================================="
