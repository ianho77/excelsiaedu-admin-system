#!/bin/bash
echo "Starting ExcelsiaEdu Admin System Server..."
echo "Current directory: $(pwd)"
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"
echo "Files in current directory:"
ls -la

# 設置環境變量
export NODE_ENV=production
export PORT=${PORT:-3000}

echo "Starting server on port $PORT..."
node index.js
