#!/bin/bash

# Meeting Attendance Monitor - Deployment Script
# This script deploys the Cloud Function and sets up Cloud Scheduler

set -e  # Exit on error

echo "=== Meeting Attendance Monitor - Deployment ==="
echo ""

# Configuration
PROJECT_ID=${PROJECT_ID:-"meeting-attendance-monitor"}
REGION=${REGION:-"us-central1"}
FUNCTION_NAME="checkMeetingAttendance"
SCHEDULER_JOB_NAME="meeting-attendance-checker"
TIMEZONE=${TIMEZONE:-"America/New_York"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env.yaml exists
if [ ! -f ".env.yaml" ]; then
    echo -e "${RED}Error: .env.yaml not found!${NC}"
    echo "Please copy .env.yaml.example to .env.yaml and fill in your values."
    exit 1
fi

# Check if service account key exists
if [ ! -f "service-account-key.json" ]; then
    echo -e "${YELLOW}Warning: service-account-key.json not found${NC}"
    echo "Make sure you've uploaded it to Secret Manager, or add it to this directory."
fi

# Set the project
echo "Setting GCP project to: $PROJECT_ID"
gcloud config set project $PROJECT_ID

# Deploy Cloud Function
echo ""
echo -e "${GREEN}Deploying Cloud Function...${NC}"
gcloud functions deploy $FUNCTION_NAME \
  --runtime nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point $FUNCTION_NAME \
  --env-vars-file .env.yaml \
  --region $REGION \
  --memory 256MB \
  --timeout 540s \
  --quiet

# Get the function URL
FUNCTION_URL=$(gcloud functions describe $FUNCTION_NAME --region=$REGION --format='value(httpsTrigger.url)')
echo -e "${GREEN}Function deployed successfully!${NC}"
echo "Function URL: $FUNCTION_URL"

# Check if scheduler job already exists
if gcloud scheduler jobs describe $SCHEDULER_JOB_NAME --location=$REGION &> /dev/null; then
    echo ""
    echo -e "${YELLOW}Scheduler job already exists. Updating...${NC}"
    gcloud scheduler jobs update http $SCHEDULER_JOB_NAME \
      --schedule="* * * * *" \
      --uri="$FUNCTION_URL" \
      --http-method=POST \
      --location=$REGION \
      --time-zone="$TIMEZONE" \
      --quiet
else
    echo ""
    echo -e "${GREEN}Creating Cloud Scheduler job...${NC}"
    gcloud scheduler jobs create http $SCHEDULER_JOB_NAME \
      --schedule="* * * * *" \
      --uri="$FUNCTION_URL" \
      --http-method=POST \
      --location=$REGION \
      --time-zone="$TIMEZONE" \
      --quiet
fi

echo ""
echo -e "${GREEN}=== Deployment Complete! ===${NC}"
echo ""
echo "Next steps:"
echo "1. Test the function:"
echo "   curl -X POST $FUNCTION_URL"
echo ""
echo "2. View logs:"
echo "   npm run logs"
echo ""
echo "3. Manually trigger the scheduler:"
echo "   gcloud scheduler jobs run $SCHEDULER_JOB_NAME --location=$REGION"
echo ""
echo "4. Check scheduler status:"
echo "   gcloud scheduler jobs describe $SCHEDULER_JOB_NAME --location=$REGION"
echo ""
