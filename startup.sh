#!/bin/bash
# Azure App Service Startup Script

echo "🚀 Starting M365 Portal in Production..."

# We assume dependencies are installed or being installed by Kudu
# If not, we install them here
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install --production=false
fi

# We skip building because we are deploying the built 'dist' folder
echo "🔌 Starting server..."
export NODE_ENV=production
npm run start
