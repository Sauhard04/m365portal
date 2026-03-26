#!/bin/bash
# Azure App Service Startup Script

echo "🚀 Starting M365 Portal in Production..."

# We assume dependencies are installed or being installed by Kudu
# If not, we install them here
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install --production=false
fi

# Ensure we are in the right directory
cd /home/site/wwwroot

echo "🔍 Checking for build artifacts..."
if [ ! -f "dist/backend/index.js" ]; then
  echo "❌ Error: Production build not found at dist/backend/index.js"
  exit 1
fi

echo "🔌 Starting server with NODE_ENV=$NODE_ENV and PORT=$PORT"
export NODE_ENV=production
npm run start
