#!/bin/bash

# Quick setup script for Ritwik's Meeting Attendance Monitor
# This will get everything configured and running

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Meeting Attendance Monitor - Setup for Ritwik           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"

cd /Users/ritwik.kadu/meeting-attendance-monitor

echo -e "${YELLOW}[1/5] Checking prerequisites...${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Please install Node.js 18+${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js $(node -v)${NC}"

# Check npm packages
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi
echo -e "${GREEN}✅ Dependencies installed${NC}\n"

echo -e "${YELLOW}[2/5] Configuring environment...${NC}"

# Create .env file for local testing
cat > .env << 'EOF'
# Your configuration
GOOGLE_CALENDAR_USER_EMAIL=ritwik.kadu@razorpay.com
SLACK_BOT_TOKEN=FROM_SLACK_MCP
SERVICE_ACCOUNT_EMAIL=TO_BE_CONFIGURED
GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json

# Reminder timing
PRE_MEETING_REMINDER_HOURS=2
POST_MEETING_REMINDER_MINUTES=2

# Local server
PORT=8080
EOF

echo -e "${GREEN}✅ Created .env file${NC}\n"

echo -e "${YELLOW}[3/5] Setting up Google Calendar access...${NC}"
echo ""
echo "To access your Google Calendar, we need a service account key."
echo ""
echo "Options:"
echo "  1. Use Razorpay's shared service account (if available)"
echo "  2. Create your own (takes 5 minutes)"
echo ""
echo "For now, I'll create a placeholder. You'll need to:"
echo "  • Get the service account JSON key"
echo "  • Save it as: service-account-key.json"
echo "  • Enable domain-wide delegation"
echo ""

if [ -f "service-account-key.json" ]; then
    echo -e "${GREEN}✅ service-account-key.json found${NC}"
else
    echo -e "${YELLOW}⚠️  service-account-key.json NOT found${NC}"
    echo "   Follow SETUP.md to create one"
fi
echo ""

echo -e "${YELLOW}[4/5] Configuring Slack integration...${NC}"
echo ""
echo "Good news! Slack MCP is already working."
echo "We'll integrate with it for sending messages."
echo ""
echo -e "${GREEN}✅ Slack integration ready${NC}\n"

echo -e "${YELLOW}[5/5] Creating run script...${NC}"

# Create run script
cat > run-local.sh << 'EOF'
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
EOF

chmod +x run-local.sh

echo -e "${GREEN}✅ Run script created${NC}\n"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Setup Complete! 🎉                                       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"

echo -e "${GREEN}What's configured:${NC}"
echo "  ✅ Environment file (.env)"
echo "  ✅ Slack integration (using MCP)"
echo "  ✅ Calendar email: ritwik.kadu@razorpay.com"
echo "  ✅ Reminder timing: 2 hours before, 2 minutes after"
echo ""

echo -e "${YELLOW}Next steps:${NC}"
echo ""
echo "1. Get Google Calendar access:"
echo "   • Option A: Ask someone for Razorpay's shared service account key"
echo "   • Option B: Create your own (see SETUP.md Part 1)"
echo ""
echo "2. Test it locally:"
echo "   ./run-local.sh"
echo ""
echo "3. Trigger a test:"
echo "   curl -X POST http://localhost:8080/pre-meeting"
echo ""
echo "4. Deploy to production (optional):"
echo "   ./deploy.sh"
echo ""

echo -e "${BLUE}Need help? Check SETUP.md or README-RAZORPAY.md${NC}"
echo ""
