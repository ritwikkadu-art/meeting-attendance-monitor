# Meeting Attendance Monitor - Setup Guide

This guide walks you through setting up the Google Meet attendance monitoring system with Slack notifications.

## Overview

This system:
- Monitors Google Calendar events for Google Meet meetings
- Waits 2 minutes after meeting start time
- Checks who hasn't joined the meeting
- Sends Slack DMs to non-attendees

## Prerequisites

- Google Workspace account with Calendar access
- Slack workspace admin access
- Google Cloud Platform account
- Node.js 18+ (for local development/testing)

---

## Part 1: Google Cloud Setup

### 1.1 Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name: `meeting-attendance-monitor`
4. Click "Create"

### 1.2 Enable Required APIs

1. In your project, go to "APIs & Services" → "Library"
2. Enable these APIs:
   - **Google Calendar API**
   - **Google Meet API** (if available)
   - **Admin SDK API** (for meeting participant data)

### 1.3 Create Service Account

1. Go to "IAM & Admin" → "Service Accounts"
2. Click "Create Service Account"
3. Name: `meeting-monitor`
4. Description: `Monitors meeting attendance and sends notifications`
5. Click "Create and Continue"
6. Skip granting roles (click "Continue")
7. Click "Done"

### 1.4 Generate Service Account Key

1. Click on the service account you just created
2. Go to "Keys" tab
3. Click "Add Key" → "Create new key"
4. Choose "JSON"
5. Click "Create"
6. **Save this file securely** - you'll need it later (rename it to `service-account-key.json`)

### 1.5 Enable Domain-Wide Delegation

1. In the service account details, click "Show domain-wide delegation"
2. Check "Enable Google Workspace Domain-wide Delegation"
3. Click "Save"
4. Note the **Client ID** (you'll need this)

### 1.6 Authorize Service Account in Google Workspace Admin

1. Go to [Google Admin Console](https://admin.google.com/)
2. Navigate to "Security" → "API Controls" → "Domain-wide Delegation"
3. Click "Add new"
4. Enter the Client ID from step 1.5
5. Add these OAuth scopes:
   ```
   https://www.googleapis.com/auth/calendar.readonly
   https://www.googleapis.com/auth/admin.directory.user.readonly
   ```
6. Click "Authorize"

---

## Part 2: Slack App Setup

### 2.1 Create Slack App

1. Go to [Slack API Dashboard](https://api.slack.com/apps)
2. Click "Create New App"
3. Choose "From scratch"
4. App Name: `Meeting Attendance Bot`
5. Select your workspace
6. Click "Create App"

### 2.2 Configure Bot Permissions

1. In your app settings, go to "OAuth & Permissions"
2. Scroll to "Scopes" → "Bot Token Scopes"
3. Add these scopes:
   - `chat:write` - Send messages
   - `users:read` - Get user information
   - `users:read.email` - Match calendar emails to Slack users
4. Scroll to top and click "Install to Workspace"
5. Click "Allow"
6. **Copy the "Bot User OAuth Token"** (starts with `xoxb-`)

### 2.3 Get User Email Mapping (Optional but Recommended)

If your Google Calendar emails don't match Slack emails, you may need to create a mapping file.

---

## Part 3: Google Cloud Function Setup

### 3.1 Install Google Cloud SDK

```bash
# macOS (using Homebrew)
brew install google-cloud-sdk

# Or download from https://cloud.google.com/sdk/docs/install
```

### 3.2 Authenticate

```bash
gcloud auth login
gcloud config set project meeting-attendance-monitor
```

### 3.3 Enable Cloud Functions API

```bash
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable cloudscheduler.googleapis.com
```

### 3.4 Create Environment Variables

Create a file named `.env.yaml` in the project directory:

```yaml
GOOGLE_CALENDAR_USER_EMAIL: "your-email@yourdomain.com"
SLACK_BOT_TOKEN: "xoxb-your-token-here"
SERVICE_ACCOUNT_EMAIL: "meeting-monitor@meeting-attendance-monitor.iam.gserviceaccount.com"
```

Replace:
- `your-email@yourdomain.com` - Your Google Workspace email (to impersonate for Calendar API)
- `xoxb-your-token-here` - Your Slack Bot Token from Part 2
- Service account email from Part 1.3

---

## Part 4: Deploy the Function

### 4.1 Upload Service Account Key

```bash
# Store the service account key as a secret
gcloud secrets create service-account-key \
  --data-file=./service-account-key.json

# Grant the Cloud Functions service account access to the secret
PROJECT_NUMBER=$(gcloud projects describe meeting-attendance-monitor --format="value(projectNumber)")
gcloud secrets add-iam-policy-binding service-account-key \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 4.2 Deploy the Function

```bash
npm run deploy
```

Or manually:

```bash
gcloud functions deploy checkMeetingAttendance \
  --runtime nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point checkMeetingAttendance \
  --env-vars-file .env.yaml \
  --region us-central1 \
  --memory 256MB \
  --timeout 540s
```

### 4.3 Set Up Cloud Scheduler

Create a scheduled job to check for meetings every minute:

```bash
gcloud scheduler jobs create http meeting-attendance-checker \
  --schedule="* * * * *" \
  --uri="https://us-central1-meeting-attendance-monitor.cloudfunctions.net/checkMeetingAttendance" \
  --http-method=POST \
  --time-zone="America/New_York" \
  --location=us-central1
```

**Note**: Adjust timezone to match your location.

---

## Part 5: Testing

### 5.1 Create a Test Meeting

1. Create a Google Calendar event with Google Meet
2. Invite 2-3 people
3. Set the start time to 5 minutes from now

### 5.2 Monitor Logs

```bash
gcloud functions logs read checkMeetingAttendance --limit 50
```

### 5.3 Verify Slack Messages

After 2 minutes of the meeting start time, non-attendees should receive a Slack DM.

---

## Troubleshooting

### Issue: "Permission denied" errors

**Solution**: Verify domain-wide delegation is set up correctly in Google Workspace Admin Console.

### Issue: Slack messages not sending

**Solutions**:
- Verify Slack bot token is correct
- Check that bot has `chat:write` and `users:read.email` scopes
- Verify the bot is installed in your workspace

### Issue: Can't detect meeting participants

**Solution**: Google Meet API has limited participant data. This solution uses Calendar API to get invited attendees. Real-time participant tracking requires Google Workspace Enterprise Plus with Meet API access.

### Issue: Wrong timezone

**Solution**: Update the Cloud Scheduler timezone in Part 4.3.

---

## Security Best Practices

1. **Never commit** `service-account-key.json` or `.env.yaml` to git
2. Use Google Secret Manager for sensitive data (already configured)
3. Restrict service account permissions to minimum required
4. Regularly rotate Slack bot token
5. Monitor Cloud Function logs for suspicious activity

---

## Cost Estimate

Based on typical usage (checking every minute for a team of 50 people):

- Cloud Functions: ~$0.50/month
- Cloud Scheduler: ~$0.10/month
- API calls: ~$0.01/month
- **Total: ~$0.60/month**

---

## Next Steps

1. Complete all setup steps above
2. Test with a real meeting
3. Customize the Slack message template in `index.js`
4. Set up error alerting (optional)
5. Consider adding features like:
   - Custom reminder times
   - Multiple reminder attempts
   - Meeting attendance reports

---

## Support

For issues or questions:
- Check the [troubleshooting section](#troubleshooting)
- Review Cloud Function logs
- Verify all API permissions are granted
