#!/bin/bash

# J.A.R.V.I.S. 1-Click Startup Script (Python Core)
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "=========================================="
echo "🦾 INITIALIZING J.A.R.V.I.S. STARK OS..."
echo "=========================================="

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "📦 Creating Python Virtual Environment..."
    python3 -m venv venv
    ./venv/bin/pip install --upgrade pip
    ./venv/bin/pip install -r requirements.txt
fi

echo "🚀 Launching Python FastAPI Server..."
./venv/bin/python3 server.py
