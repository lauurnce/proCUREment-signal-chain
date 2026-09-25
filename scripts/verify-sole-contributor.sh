#!/usr/bin/env bash
# SignalChain HQ: check that every commit in this repo is authored and
# committed by the owner (git config hq.ownerEmail) and that no commit
# message carries a co-author trailer or AI attribution line.

set -u
cd "$(dirname "$0")/.." || exit 1

owner="$(git config --get hq.ownerEmail || true)"
if [ -z "$owner" ]; then
  echo "Owner email not set. Run in your own terminal: git config hq.ownerEmail \"<your GitHub email>\""
  exit 1
fi
owner_lc="$(printf '%s' "$owner" | tr '[:upper:]' '[:lower:]')"

if ! git rev-parse --verify HEAD >/dev/null 2>&1; then
  echo "No commits yet. Nothing to check."
  exit 0
fi

problems=0

others="$(git log --all --format='%ae%n%ce' | tr '[:upper:]' '[:lower:]' | sort -u | grep -v -x -F "$owner_lc" || true)"
if [ -n "$others" ]; then
  echo "Commits by someone other than $owner:"
  printf '%s\n' "$others" | sed 's/^/  /'
  problems=1
fi

flagged="$(git log --all --format='%h %s%n%b' | grep -i -E 'co-authored-by:|generated (with|by) \[?claude|claude-session:' || true)"
if [ -n "$flagged" ]; then
  echo "Commit messages with co-author or AI attribution lines:"
  printf '%s\n' "$flagged" | sed 's/^/  /'
  problems=1
fi

total="$(git rev-list --all --count)"
if [ "$problems" -eq 0 ]; then
  echo "OK: all $total commit(s) are yours ($owner), with no co-author or AI attribution lines."
  exit 0
fi

echo
echo "Found problems. Do not push. Ask Claude to explain the safest fix before changing any history."
exit 1
