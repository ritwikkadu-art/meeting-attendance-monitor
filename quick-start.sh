#!/bin/bash

# Quick Start Script for Meeting Attendance Monitor
# This script helps you get started quickly

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Meeting Attendance Monitor - Quick Start ===${NC}\n"

# Step 1: Check Node.js
echo -e "${YELLOW}[1/6] Checking Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version must be 18 or higher. Current: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Step 2: Check gcloud CLI
echo -e "\n${YELLOW}[2/6] Checking Google Cloud SDK...${NC}"
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI is not installed."
    echo "   Install from: https://cloud.google.com/sdk/docs/install"
    echo "   Or run: brew install google-cloud-sdk"
    exit 1
fi

echo "✅ gcloud CLI detected"

# Step 3: Install dependencies
echo -e "\n${YELLOW}[3/6] Installing dependencies...${NC}"
npm install
echo "✅ Dependencies installed"

# Step 4: Check for configuration files
echo -e "\n${YELLOW}[4/6] Checking configuration...${NC}"

if [ ! -f ".env.yaml" ]; then
    echo "⚠️  .env.yaml not found. Creating from template..."
    cp .env.yaml.example .env.yaml
    echo "📝 Please edit .env.yaml with your actual values:"
    echo "   - GOOGLE_CALENDAR_USER_EMAIL"
    echo "   - SLACK_BOT_TOKEN"
    echo "   - SERVICE_ACCOUNT_EMAIL"
    echo ""
    echo "   Run: nano .env.yaml"
else
    echo "✅ .env.yaml found"
fi

if [ ! -f ".env" ]; then
    echo "⚠️  .env not found. Creating from template..."
    cp .env.example .env
    echo "📝 For local testing, also edit .env with your values"
else
    echo "✅ .env found"
fi

if [ ! -f "service-account-key.json" ]; then
    echo "⚠️  service-account-key.json not found"
    echo "📝 Download your service account key from Google Cloud Console"
    echo "   and save it as service-account-key.json"
else
    echo "✅ service-account-key.json found"
fi

# Step 5: Authenticate with Google Cloud
echo -e "\n${YELLOW}[5/6] Google Cloud Authentication${NC}"
echo "Checking gcloud authentication status..."

if gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
    ACTIVE_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)")
    echo "✅ Already authenticated as: $ACTIVE_ACCOUNT"
else
    echo "⚠️  Not authenticated. Run this command to authenticate:"
    echo "   gcloud auth login"
fi

# Step 6: Summary and Next Steps
echo -e "\n${GREEN}=== Setup Summary ===${NC}\n"

echo "✅ Quick start complete!"
echo ""
echo "Next steps:"
echo ""
echo "1. Complete the full setup following SETUP.md"
echo "   This includes:"
echo "   - Creating Google Cloud project"
echo "   - Enabling APIs"
echo "   - Creating Slack app"
echo "   - Configuring permissions"
echo ""
echo "2. Edit configuration files:"
echo "   nano .env.yaml    # For Cloud Functions deployment"
echo "   nano .env         # For local testing"
echo ""
echo "3. Test locally:"
echo "   npm test"
echo ""
echo "4. Deploy to Google Cloud:"
echo "   ./deploy.sh"
echo ""
echo "5. View logs:"
echo "   npm run logs"
echo ""
echo -e "${BLUE}📖 Read SETUP.md for detailed instructions${NC}"
echo ""
