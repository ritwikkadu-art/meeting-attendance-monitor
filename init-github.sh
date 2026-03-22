#!/bin/bash

# Initialize GitHub repository for Razorpay
# This script helps you set up and push the project to Razorpay GitHub

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Meeting Attendance Monitor - GitHub Setup               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${YELLOW}⚠️  GitHub CLI (gh) is not installed${NC}"
    echo "Install it with: brew install gh"
    echo "Then run: gh auth login"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not authenticated with GitHub${NC}"
    echo "Run: gh auth login"
    exit 1
fi

echo -e "${GREEN}✅ GitHub CLI is installed and authenticated${NC}\n"

# Ask for repository name
echo -e "${YELLOW}Repository Configuration${NC}"
read -p "Repository name [meeting-attendance-monitor]: " REPO_NAME
REPO_NAME=${REPO_NAME:-meeting-attendance-monitor}

read -p "Organization [razorpay]: " ORG
ORG=${ORG:-razorpay}

read -p "Make it public (within org)? [y/N]: " IS_PUBLIC
IS_PUBLIC=${IS_PUBLIC:-n}

if [[ "$IS_PUBLIC" =~ ^[Yy]$ ]]; then
    VISIBILITY="--public"
else
    VISIBILITY="--private"
fi

echo ""
echo -e "${BLUE}Summary:${NC}"
echo "  Organization: $ORG"
echo "  Repository: $REPO_NAME"
echo "  Visibility: $([ -z \"$VISIBILITY\" ] && echo \"Private\" || echo \"Public (internal)\")"
echo ""
read -p "Continue? [Y/n]: " CONFIRM
CONFIRM=${CONFIRM:-y}

if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

echo ""
echo -e "${YELLOW}[1/5] Creating GitHub repository...${NC}"

# Create repository
if gh repo create "$ORG/$REPO_NAME" $VISIBILITY \
    --description "Automatically reminds people via Slack when they haven't joined a Google Meet meeting" \
    --gitignore=Node \
    --enable-issues \
    --enable-wiki=false; then
    echo -e "${GREEN}✅ Repository created${NC}"
else
    echo -e "${YELLOW}⚠️  Repository might already exist, continuing...${NC}"
fi

echo ""
echo -e "${YELLOW}[2/5] Initializing git repository...${NC}"

# Initialize git if not already
if [ ! -d .git ]; then
    git init
    echo -e "${GREEN}✅ Git initialized${NC}"
else
    echo -e "${GREEN}✅ Git already initialized${NC}"
fi

# Add remote
if git remote get-url origin &> /dev/null; then
    echo -e "${YELLOW}⚠️  Remote 'origin' already exists, updating...${NC}"
    git remote set-url origin "https://github.com/$ORG/$REPO_NAME.git"
else
    git remote add origin "https://github.com/$ORG/$REPO_NAME.git"
fi

echo -e "${GREEN}✅ Remote configured: https://github.com/$ORG/$REPO_NAME${NC}"

echo ""
echo -e "${YELLOW}[3/5] Setting up GitHub Secrets...${NC}"
echo ""
echo "You'll need to add these secrets manually in GitHub:"
echo ""
echo "  1. Go to: https://github.com/$ORG/$REPO_NAME/settings/secrets/actions"
echo "  2. Click 'New repository secret'"
echo "  3. Add each of these:"
echo ""
echo -e "${BLUE}Required secrets:${NC}"
echo "  • GCP_PROJECT_ID          → Your GCP project ID"
echo "  • GCP_SA_KEY              → Service account JSON key (entire file contents)"
echo "  • CALENDAR_USER_EMAIL     → Email to monitor (e.g., tech-ops@razorpay.com)"
echo "  • SLACK_BOT_TOKEN         → Slack bot token (starts with xoxb-)"
echo "  • SERVICE_ACCOUNT_EMAIL   → Service account email"
echo ""
read -p "Press Enter when you've added all secrets (or Ctrl+C to do it later)..."

echo ""
echo -e "${YELLOW}[4/5] Creating initial commit...${NC}"

# Stage all files
git add .

# Create commit
git commit -m "feat: initial commit - meeting attendance monitor

- Cloud Function for monitoring Google Meet attendance
- Slack integration for sending reminders
- GitHub Actions for automated deployment
- Comprehensive documentation

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

echo -e "${GREEN}✅ Initial commit created${NC}"

echo ""
echo -e "${YELLOW}[5/5] Pushing to GitHub...${NC}"

# Push to GitHub
git branch -M main
git push -u origin main

echo -e "${GREEN}✅ Pushed to GitHub!${NC}"

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Setup Complete! 🎉                                       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Repository URL:${NC} https://github.com/$ORG/$REPO_NAME"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo ""
echo "1. Add GitHub Secrets (if you haven't already):"
echo "   https://github.com/$ORG/$REPO_NAME/settings/secrets/actions"
echo ""
echo "2. Complete Google Cloud & Slack setup:"
echo "   See README-RAZORPAY.md"
echo ""
echo "3. GitHub Actions will auto-deploy on push to main"
echo "   View workflows: https://github.com/$ORG/$REPO_NAME/actions"
echo ""
echo "4. Monitor deployment:"
echo "   gcloud functions logs read checkMeetingAttendance --limit=50"
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"
echo ""
