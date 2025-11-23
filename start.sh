#!/bin/bash

echo "🚀 Starting blog server..."
echo "📍 Server will be available at: http://localhost:8000"
echo "🔄 Press Ctrl+C to stop the server"
echo ""

# Kill any existing server on port 8000
lsof -ti:8000 | xargs kill -9 2>/dev/null || true

# Start the server
python3 server.py