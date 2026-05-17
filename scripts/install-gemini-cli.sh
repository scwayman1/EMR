#!/usr/bin/env bash
# Install the Gemini CLI globally via npm.
# Works on macOS, Linux, and WSL. Requires Node 20+.
set -euo pipefail

PACKAGE="@google/gemini-cli"

if ! command -v node >/dev/null 2>&1; then
  echo "node not found. Install Node 20+ first (https://nodejs.org)." >&2
  exit 1
fi

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "${NODE_MAJOR}" -lt 20 ]; then
  echo "Node ${NODE_MAJOR} detected; Gemini CLI needs Node 20+." >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm not found. Install npm (ships with Node) first." >&2
  exit 1
fi

echo "Installing ${PACKAGE} globally..."
if [ "$(id -u)" -ne 0 ] && [ -w "$(npm root -g 2>/dev/null || echo /usr/local/lib/node_modules)" ]; then
  npm install -g "${PACKAGE}"
elif [ "$(id -u)" -eq 0 ]; then
  npm install -g "${PACKAGE}"
else
  sudo npm install -g "${PACKAGE}"
fi

if command -v gemini >/dev/null 2>&1; then
  echo "Installed: $(gemini --version 2>/dev/null || echo 'gemini')"
  echo "Run 'gemini' to start. First run will prompt for auth."
else
  echo "Install completed but 'gemini' is not on PATH." >&2
  echo "Add \$(npm bin -g) to PATH, then re-open your shell." >&2
  exit 1
fi
