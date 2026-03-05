#!/bin/sh
set -e
cd /app
# Ensure deps are installed (populates volume on first run or when package.json changes)
npm install
# API needs Prisma client
if [ -d "packages/api" ]; then
  npx prisma generate
fi
exec "$@"
