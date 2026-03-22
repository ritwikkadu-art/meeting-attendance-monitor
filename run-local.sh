#!/bin/bash

echo "🚀 Starting Meeting Attendance Monitor..."
echo ""
echo "Endpoints:"
echo "  • POST http://localhost:8080/           - Check meetings (2 min after start)"
echo "  • POST http://localhost:8080/pre-meeting - Remind non-responders (2 hours before)"
echo ""
echo "Press Ctrl+C to stop"
echo ""

node index.js
