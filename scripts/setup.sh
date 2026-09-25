#!/usr/bin/env bash
# SignalChain HQ, first-time setup check. Safe to run again.
# It never installs global tools and never changes your git name or email.
# It only: checks tools, turns on the repo's git hooks, makes scripts executable,
# and creates the private folders that stay out of git.

set -u
cd "$(dirname "$0")/.." || exit 1

ok()   { printf '  [ok]   %s\n' "$1"; }
warn() { printf '  [todo] %s\n' "$1"; TODO=$((TODO + 1)); }
TODO=0

echo "SignalChain HQ setup"
echo

echo "1. Tools"
if command -v git >/dev/null 2>&1; then ok "git $(git --version | awk '{print $3}')"; else warn "git missing: xcode-select --install"; fi
if command -v node >/dev/null 2>&1; then
  major="$(node -p 'process.versions.node.split(".")[0]')"
  if [ "$major" -ge 24 ]; then ok "node $(node -v)"; else warn "node $(node -v) found, Node 24 LTS recommended: nvm install 24 && nvm use 24"; fi
else
  warn "node missing: nvm install 24 && nvm use 24"
fi
if command -v pnpm >/dev/null 2>&1; then ok "pnpm $(pnpm -v)"; else warn "pnpm missing: npm install -g pnpm"; fi
if command -v gh >/dev/null 2>&1; then ok "gh $(gh --version | head -1 | awk '{print $3}')"; else warn "gh missing (needed for GitHub): brew install gh"; fi
if command -v claude >/dev/null 2>&1; then ok "claude (Claude Code) found"; else warn "Claude Code CLI not found on PATH (see https://code.claude.com/docs)"; fi
echo

echo "2. Git repo and hooks"
if [ ! -d .git ] && [ ! -f .git ]; then
  warn "not a git repo yet: run 'git init -b main' in this folder, then run this script again"
else
  git config core.hooksPath .githooks
  chmod +x .githooks/* scripts/*.sh 2>/dev/null
  ok "hooks active from .githooks (commit-msg, pre-commit)"
  name="$(git config --get user.name || true)"
  email="$(git config --get user.email || true)"
  owner="$(git config --get hq.ownerEmail || true)"
  if [ -n "$name" ]; then ok "user.name = $name"; else warn "set your name: git config user.name \"Lawrence Panes\""; fi
  if [ -n "$email" ]; then ok "user.email = $email"; else warn "set your email: git config user.email \"<your GitHub email>\""; fi
  if [ -n "$owner" ]; then ok "hq.ownerEmail = $owner"; else warn "set owner: git config hq.ownerEmail \"<same GitHub email>\""; fi
  if [ -n "$email" ] && [ -n "$owner" ] && [ "$email" != "$owner" ]; then warn "user.email and hq.ownerEmail differ, make them the same"; fi
fi
echo

echo "3. Private folders (gitignored)"
mkdir -p docs/references/private docs/qa/shots docs/plans
ok "docs/references/private, docs/qa/shots, docs/plans"
if [ -f .env ]; then ok ".env exists"; else echo "  [info] no .env yet, create it in Phase 7: cp .env.example .env"; fi
echo

if [ "$TODO" -eq 0 ]; then
  echo "All set. Next: open this folder in VS Code, run 'claude', and paste prompt P0.1 from docs/PROMPTS.md."
else
  echo "$TODO item(s) to do above. Fix them in your own terminal, then run: bash scripts/setup.sh"
fi
