#!/bin/bash
# Container setup for Claude Code on the web (the "Run setup script" step).
#
# CRITICAL: this script MUST terminate. Never launch a long-running process
# here — `npm run dev`, `npm run dev:server`, `wrangler dev`, or `vite` all
# run forever and will hang "Setting up a cloud container" indefinitely.
# Setup only needs dependencies installed; run dev/build/typecheck on demand
# once the session is live.
#
# Runs synchronously (no async JSON on stdout), so the session starts only
# after dependencies are ready — no race where a check runs before install.
set -euo pipefail

# Only do work in the remote (web) environment; local sessions manage their
# own dependencies.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# Install all workspace dependencies (client + server). `npm install`, not
# `npm ci`, so the cached container layer is reused on later runs.
# Idempotent and safe to repeat. Redirect npm's chatter to stderr so it
# stays out of the session context that a SessionStart hook feeds Claude.
npm install --no-fund --no-audit 1>&2

echo "Holos dependencies installed — container ready." 1>&2
