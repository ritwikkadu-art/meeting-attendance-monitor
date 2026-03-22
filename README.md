# Meeting Attendance Monitor

> **Razorpay Internal Tool** - Automatically sends Slack DMs to attendees who haven't joined a Google Meet meeting 2 minutes after it starts.

📖 **For Razorpay employees:** See [README-RAZORPAY.md](./README-RAZORPAY.md) for setup and usage

---

## Quick Start

### 1. Prerequisites
- Google Workspace account
- Slack workspace (with admin access)
- Google Cloud Platform account
- Node.js 18+ installed

### 2. Setup (First Time)

Follow the complete setup guide: **[SETUP.md](./SETUP.md)**

The setup includes:
- Creating a Google Cloud project
- Enabling APIs and setting up service accounts
- Creating a Slack bot
- Configuring permissions

### 3. Install Dependencies

```bash
cd meeting-attendance-monitor
npm install
```

### 4. Configure Environment

```bash
# Copy the example env file
cp .env.yaml.example .env.yaml

# Edit .env.yaml with your actual values
nano .env.yaml
```

Required values:
- `GOOGLE_CALENDAR_USER_EMAIL` - Your Google Workspace email
- `SLACK_BOT_TOKEN` - Your Slack bot token (starts with `xoxb-`)
- `SERVICE_ACCOUNT_EMAIL` - Your service account email

### 5. Deploy

```bash
# Make deploy script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

Or use npm:

```bash
npm run deploy
```

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloud Scheduler                          │
│              (Triggers every minute)                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Cloud Function (Node.js)                       │
│                                                             │
│  1. Query Google Calendar for meetings started 2 min ago   │
│  2. Get list of attendees who haven't accepted             │
│  3. Look up Slack users by email                           │
│  4. Send personalized DM to each non-attendee              │
└─────────────────────────────────────────────────────────────┘
```

### Key Features

- ✅ Runs automatically every minute
- ✅ Only messages people who haven't accepted the invite
- ✅ Personalized messages with meeting links
- ✅ Rate-limited to avoid Slack API throttling
- ✅ Comprehensive logging for debugging

## Testing

### Local Testing

```bash
# Set environment variables
export GOOGLE_CALENDAR_USER_EMAIL="your-email@domain.com"
export SLACK_BOT_TOKEN="xoxb-your-token"
export SERVICE_ACCOUNT_EMAIL="your-sa@project.iam.gserviceaccount.com"
export GOOGLE_APPLICATION_CREDENTIALS="./service-account-key.json"

# Run locally
npm start
```

In another terminal:
```bash
curl -X POST http://localhost:8080/
```

### Production Testing

```bash
# Get the function URL
gcloud functions describe checkMeetingAttendance --region=us-central1 --format='value(httpsTrigger.url)'

# Test it
curl -X POST <FUNCTION_URL>
```

### View Logs

```bash
npm run logs

# Or with gcloud directly
gcloud functions logs read checkMeetingAttendance --limit 100
```

## Configuration

### Customizing the Reminder Time

To change from 2 minutes to a different time, edit `index.js`:

```javascript
// In getMeetingsStarted2MinutesAgo()
const twoMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes
const startTimeMin = new Date(twoMinutesAgo.getTime() - 30 * 1000);
const startTimeMax = new Date(twoMinutesAgo.getTime() + 30 * 1000);
```

### Customizing the Slack Message

Edit the `createReminderMessage()` function in `index.js`:

```javascript
function createReminderMessage(event, meetingLink, attendee) {
  return `Your custom message here: ${meetingLink}`;
}
```

### Changing Schedule Frequency

Edit the cron schedule in `deploy.sh`:

```bash
# Every minute (default)
--schedule="* * * * *"

# Every 5 minutes
--schedule="*/5 * * * *"

# Every 30 seconds (requires two jobs)
--schedule="* * * * *" --schedule-offset="30s"
```

## Project Structure

```
meeting-attendance-monitor/
├── index.js                 # Main Cloud Function code
├── package.json             # Node.js dependencies
├── .env.yaml.example        # Environment variables template
├── .env.yaml                # Your actual config (gitignored)
├── service-account-key.json # Google service account key (gitignored)
├── deploy.sh                # Deployment script
├── SETUP.md                 # Complete setup guide
├── README.md                # This file
└── .gitignore              # Git ignore rules
```

## Troubleshooting

### "Permission denied" when accessing Calendar

**Fix**: Verify domain-wide delegation in Google Workspace Admin Console.

```bash
# Check service account email
grep SERVICE_ACCOUNT_EMAIL .env.yaml
```

### Slack messages not sending

**Fixes**:
1. Verify bot token: `grep SLACK_BOT_TOKEN .env.yaml`
2. Check bot permissions in Slack API dashboard
3. Ensure bot is installed in workspace

### No meetings detected

**Checks**:
1. Verify you have meetings in your calendar
2. Check that meetings have Google Meet links
3. Verify the time window (2 min ± 30 sec)
4. Check logs: `npm run logs`

### Function timeout errors

**Fix**: Increase timeout in `deploy.sh`:

```bash
--timeout 540s  # Increase to 9 minutes (max)
```

## Cost Breakdown

Estimated monthly cost for a team of 50 people:

| Service | Usage | Cost |
|---------|-------|------|
| Cloud Functions | ~44,000 invocations/month | $0.40 |
| Cloud Scheduler | 1 job | $0.10 |
| Calendar API | ~44,000 calls/month | $0.00* |
| Slack API | ~500 calls/month | $0.00* |
| **Total** | | **~$0.50/month** |

*Free tier

## Security

- ✅ Service account keys stored in Secret Manager
- ✅ Environment variables not committed to git
- ✅ Minimal IAM permissions (principle of least privilege)
- ✅ HTTPS-only communication
- ✅ No PII stored permanently

## Limitations

1. **No real-time participant tracking**: Google Meet API has limited participant data unless you have Enterprise Plus. This solution uses Calendar invite status as a proxy.

2. **Email matching**: Attendees must have the same email in Google Calendar and Slack.

3. **Scheduling precision**: Runs every minute, so there's a ~30-60 second variation in when reminders are sent.

4. **Google Workspace only**: Requires Google Workspace (not personal Gmail).

## Future Enhancements

- [ ] Multiple reminder attempts (e.g., at 2, 5, and 10 minutes)
- [ ] Weekly attendance reports
- [ ] Integration with Google Meet live participant data (Enterprise Plus)
- [ ] Custom reminder schedules per meeting
- [ ] Slack slash commands for manual triggers
- [ ] Dashboard for monitoring

## Support

- Check [SETUP.md](./SETUP.md) for detailed setup instructions
- View logs: `npm run logs`
- Report issues: Create a GitHub issue

## License

MIT

---

**Built with ❤️ for remote teams**
