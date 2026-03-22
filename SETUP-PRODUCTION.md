# Production Setup - Step by Step

## What We're Setting Up

A service account that can:
- ✅ Read your Google Calendar
- ✅ Access it on behalf of you (domain-wide delegation)
- ✅ Run 24/7 without you being logged in
- ✅ Send Slack reminders via MCP

---

## ✅ COMPLETED: Steps 1-4

**GCP Project:** `razorpay-meeting-monitor`
**Service Account:** `meeting-monitor@razorpay-meeting-monitor.iam.gserviceaccount.com`
**Service Account Key:** `service-account-key.json` (downloaded)
**OAuth2 Client ID:** `112289661437190530839`

---

## 🔴 REQUIRED: Steps 5-6 (Need Admin Access)

### Step 5: Enable Domain-Wide Delegation

**In GCP Console:**
1. Go to: https://console.cloud.google.com/iam-admin/serviceaccounts?project=razorpay-meeting-monitor
2. Click on `meeting-monitor@razorpay-meeting-monitor.iam.gserviceaccount.com`
3. Click "Show domain-wide delegation"
4. Check "Enable Google Workspace Domain-wide Delegation"
5. Click "Save"

---

### Step 6: Authorize in Google Workspace Admin

**⚠️ You need Workspace Admin access for this step**

If you don't have admin access, ask someone who does (like IT/admin team) to:

1. Go to: https://admin.google.com/
2. Security → API Controls → Domain-wide Delegation
3. Click "Add new"
4. **Client ID**: `112289661437190530839`
5. **OAuth Scopes** (paste exactly):
   ```
   https://www.googleapis.com/auth/calendar.readonly
   ```
6. Click "Authorize"

**Alternative:** Send this to your admin:

```
Hi! I need domain-wide delegation for a Calendar monitoring service account.

Client ID: 112289661437190530839
OAuth Scope: https://www.googleapis.com/auth/calendar.readonly

This allows the service account to read calendar events on behalf of users.
```

---

## Step 7: Test It!

Once Steps 5-6 are done, test calendar access:

```bash
cd /Users/ritwik.kadu/meeting-attendance-monitor
GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json node fetch-calendar.js
```

You should see your tomorrow's meetings!

---

## Step 8: Deploy to Production

Once calendar access works, deploy to Google Cloud:

```bash
# Set up GitHub secrets (one-time)
gh secret set GCP_PROJECT_ID --body "razorpay-meeting-monitor"
gh secret set GCP_SA_KEY --body "$(cat service-account-key.json)"
gh secret set GOOGLE_CALENDAR_USER_EMAIL --body "ritwik.kadu@razorpay.com"

# Push to GitHub to trigger deployment
git add .
git commit -m "Deploy meeting attendance monitor"
git push origin main
```

The GitHub Action will:
1. Deploy two Cloud Functions (pre-meeting and post-meeting reminders)
2. Set up Cloud Schedulers (every minute for post-meeting, every 15 min for pre-meeting)
3. Configure environment variables

---

## Step 9: Monitor in Production

**Cloud Functions:**
- https://console.cloud.google.com/functions/list?project=razorpay-meeting-monitor

**Cloud Scheduler:**
- https://console.cloud.google.com/cloudscheduler?project=razorpay-meeting-monitor

**Logs:**
```bash
# View post-meeting reminder logs
gcloud functions logs read checkMeetingAttendance --project=razorpay-meeting-monitor

# View pre-meeting reminder logs
gcloud functions logs read sendPreMeetingReminders --project=razorpay-meeting-monitor
```

---

## Quick Reference

**Project ID:** `razorpay-meeting-monitor`
**Service Account:** `meeting-monitor@razorpay-meeting-monitor.iam.gserviceaccount.com`
**OAuth2 Client ID:** `112289661437190530839`
**Required Scope:** `https://www.googleapis.com/auth/calendar.readonly`

---

## Troubleshooting

**"I don't have Workspace Admin access"**
→ Send the Step 6 instructions to your IT/admin team

**"Calendar API returns 403"**
→ Domain-wide delegation not yet authorized (Step 6)

**"Service account key not found"**
→ Run: `ls -la service-account-key.json` to verify it exists

**"How do I share this with the team?"**
→ Update `GOOGLE_CALENDAR_USER_EMAIL` in GitHub secrets for each user
