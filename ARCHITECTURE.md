# Architecture Documentation

## System Overview

The Meeting Attendance Monitor is a serverless application that automatically notifies meeting attendees who haven't joined a Google Meet meeting after it has started.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Google Cloud Platform                       │
│                                                                 │
│  ┌─────────────────────┐                                       │
│  │  Cloud Scheduler    │                                       │
│  │                     │                                       │
│  │  Triggers every     │                                       │
│  │  minute with        │                                       │
│  │  HTTP POST          │                                       │
│  └──────────┬──────────┘                                       │
│             │                                                   │
│             ▼                                                   │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │           Cloud Function (Node.js 20)                   │  │
│  │                                                           │  │
│  │  Entry point: checkMeetingAttendance()                   │  │
│  │                                                           │  │
│  │  ┌──────────────────────────────────────────────┐       │  │
│  │  │ 1. Get meetings started ~2 minutes ago       │       │  │
│  │  │    - Query Google Calendar API               │       │  │
│  │  │    - Filter for Google Meet events           │       │  │
│  │  └──────────────────────────────────────────────┘       │  │
│  │                      │                                    │  │
│  │                      ▼                                    │  │
│  │  ┌──────────────────────────────────────────────┐       │  │
│  │  │ 2. Get list of non-attendees                 │       │  │
│  │  │    - Check RSVP status (not 'accepted')      │       │  │
│  │  └──────────────────────────────────────────────┘       │  │
│  │                      │                                    │  │
│  │                      ▼                                    │  │
│  │  ┌──────────────────────────────────────────────┐       │  │
│  │  │ 3. Match emails to Slack users               │       │  │
│  │  │    - Call Slack users.lookupByEmail          │       │  │
│  │  └──────────────────────────────────────────────┘       │  │
│  │                      │                                    │  │
│  │                      ▼                                    │  │
│  │  ┌──────────────────────────────────────────────┐       │  │
│  │  │ 4. Send Slack DMs                            │       │  │
│  │  │    - Personalized message with meeting link  │       │  │
│  │  │    - Rate-limited to avoid API throttling    │       │  │
│  │  └──────────────────────────────────────────────┘       │  │
│  │                                                           │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                         │                    │
                         │                    │
            ┌────────────┘                    └──────────────┐
            ▼                                                 ▼
┌──────────────────────────┐                  ┌──────────────────────────┐
│   Google Calendar API    │                  │      Slack API           │
│                          │                  │                          │
│  - events.list()         │                  │  - users.lookupByEmail() │
│  - Get meeting details   │                  │  - chat.postMessage()    │
│  - Get attendee list     │                  │                          │
│  - Check RSVP status     │                  │                          │
└──────────────────────────┘                  └──────────────────────────┘
```

## Component Details

### 1. Cloud Scheduler

**Purpose**: Triggers the Cloud Function on a regular schedule

**Configuration**:
- Schedule: `* * * * *` (every minute)
- Method: HTTP POST
- Region: us-central1
- Timezone: Configurable (default: America/New_York)

**Why every minute?**
- Meetings can start at any time
- 1-minute granularity ensures reminders are sent within 2-3 minutes of meeting start
- Cost-effective (Cloud Scheduler is $0.10/month per job)

### 2. Cloud Function

**Runtime**: Node.js 20
**Memory**: 256MB
**Timeout**: 540s (9 minutes)
**Trigger**: HTTP
**Entry Point**: `checkMeetingAttendance`

**Execution Flow**:

```javascript
1. getMeetingsStarted2MinutesAgo()
   ↓
2. For each meeting:
   ↓
3. getNonAttendees(event)
   ↓
4. For each non-attendee:
   ↓
5. findSlackUserByEmail(email)
   ↓
6. sendSlackDM(userId, message)
```

**Key Functions**:

| Function | Purpose | API Calls |
|----------|---------|-----------|
| `getCalendarClient()` | Creates authenticated Google Calendar client with domain-wide delegation | - |
| `getMeetingsStarted2MinutesAgo()` | Queries Calendar API for meetings in the 1.5-2.5 minute window | `calendar.events.list()` |
| `getNonAttendees()` | Filters attendees with responseStatus != 'accepted' | - |
| `findSlackUserByEmail()` | Looks up Slack user by email address | `slack.users.lookupByEmail()` |
| `sendSlackDM()` | Sends personalized DM with meeting link | `slack.chat.postMessage()` |
| `createReminderMessage()` | Generates message text | - |

### 3. Authentication & Authorization

#### Google Calendar API

**Method**: Service Account with Domain-Wide Delegation

**Flow**:
1. Service account acts on behalf of a specific user (via JWT `subject` field)
2. Requests Calendar API access to read events
3. Requires these OAuth scopes:
   - `https://www.googleapis.com/auth/calendar.readonly`
   - `https://www.googleapis.com/auth/admin.directory.user.readonly`

**Why Domain-Wide Delegation?**
- Allows service account to impersonate a user
- No need for individual OAuth tokens
- Works for all users in the organization

#### Slack API

**Method**: Bot User OAuth Token

**Permissions Required**:
- `chat:write` - Send messages to users
- `users:read.email` - Look up users by email address

**Token Type**: Bot token (starts with `xoxb-`)

### 4. Data Flow

```
Time: T+0 (Meeting starts)
├─ Calendar Event created/updated
│
Time: T+2min (Function runs)
├─ Cloud Scheduler triggers function
├─ Function queries Calendar API
│  └─ Returns events with start time between T+1.5 and T+2.5
├─ For each event:
│  ├─ Get attendees list
│  ├─ Filter by responseStatus != 'accepted'
│  ├─ For each non-attendee:
│  │  ├─ Look up Slack user by email
│  │  ├─ Generate personalized message
│  │  └─ Send DM via Slack API
│  └─ Rate limit: 100ms between messages
└─ Return summary (meetings processed, messages sent)
```

## Scalability

### Current Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| Cloud Function Invocations | 1,440/day | Once per minute × 60 min × 24 hours |
| Calendar API Queries | 1,440/day | One per function invocation |
| Slack API Calls | ~2,000/day | Varies based on meeting attendees |
| Function Memory | 256MB | Sufficient for processing 100+ events |
| Function Timeout | 540s | Allows ~50 messages at 100ms each + API overhead |

### Scaling Considerations

**For larger organizations (100+ meetings/day)**:

1. **Batch processing**: Group meetings by time window
2. **Parallel execution**: Use Promise.all() for independent API calls
3. **Caching**: Cache Slack user lookups (email → userId mapping)
4. **Rate limiting**: Implement exponential backoff for API calls

**Estimated capacity**:
- Small team (10 people, 20 meetings/day): ~40 DMs/day
- Medium team (50 people, 100 meetings/day): ~200 DMs/day
- Large team (200 people, 500 meetings/day): ~1,000 DMs/day

## Error Handling

### Retry Logic

| Error Type | Handling | Retry |
|------------|----------|-------|
| Calendar API rate limit | Exponential backoff | Yes (automatic) |
| Slack API rate limit | 100ms delay between calls | No |
| User not found in Slack | Log warning, skip user | No |
| Function timeout | Log error, return partial results | Next invocation |
| Network errors | Automatic retry (Google Cloud) | Yes (automatic) |

### Logging Strategy

All logs are sent to Cloud Logging with these levels:

- **INFO**: Normal operation (meetings found, messages sent)
- **WARNING**: Recoverable errors (user not found)
- **ERROR**: Critical failures (API errors, authentication failures)

**Example log output**:
```
=== Meeting Attendance Check Started ===
Timestamp: 2026-03-22T10:02:00.000Z
Looking for meetings started between 2026-03-22T10:00:00.000Z and 2026-03-22T10:01:00.000Z
Found 2 Google Meet events that started ~2 minutes ago

Processing meeting: "Weekly Team Sync"
Meeting start time: 2026-03-22T10:00:00.000Z
Event "Weekly Team Sync": 3/5 attendees haven't accepted
Processing attendee: user1@company.com (status: needsAction)
Sent DM to user U123ABC

=== Summary ===
Meetings processed: 2
Reminders sent: 5
Failed: 0
```

## Security

### Secrets Management

| Secret | Storage | Access |
|--------|---------|--------|
| Service Account Key | Google Secret Manager | Cloud Function service account |
| Slack Bot Token | Environment variable (.env.yaml) | Cloud Function runtime |
| Calendar User Email | Environment variable | Cloud Function runtime |

### Principle of Least Privilege

**Service Account Permissions**:
- ✅ Calendar: Read-only
- ✅ Admin SDK: Read users only
- ❌ No write access to Calendar
- ❌ No admin privileges

**Slack Bot Permissions**:
- ✅ Send messages (chat:write)
- ✅ Read user emails (users:read.email)
- ❌ No channel access
- ❌ No admin permissions

### Data Privacy

**Data Retention**:
- No user data stored permanently
- Logs retained for 30 days (Cloud Logging default)
- No PII in logs (email addresses are logged for debugging)

**Data in Transit**:
- All API calls use HTTPS
- TLS 1.2+ enforced

## Cost Analysis

### Monthly Cost Breakdown

Based on a team of 50 people with 100 meetings/day:

| Service | Usage | Cost |
|---------|-------|------|
| Cloud Functions | 44,640 invocations/month @ $0.40/million | $0.02 |
| Cloud Functions | 11,160 GB-seconds/month @ $0.0000025/GB-sec | $0.03 |
| Cloud Scheduler | 1 job | $0.10 |
| Calendar API | 44,640 calls/month | Free (under quota) |
| Slack API | 6,000 calls/month | Free |
| Cloud Logging | 50MB/month | Free (under quota) |
| Secret Manager | 2 secrets × 6 accesses/hour | Free (under quota) |
| **Total** | | **~$0.15/month** |

**Scaling costs**:
- 10x traffic (500 people, 1000 meetings/day): ~$1.50/month
- 100x traffic (5000 people, 10000 meetings/day): ~$15/month

## Monitoring

### Key Metrics

| Metric | Source | Alert Threshold |
|--------|--------|-----------------|
| Function invocations | Cloud Monitoring | < 1400/day (missing runs) |
| Function errors | Cloud Monitoring | > 5% error rate |
| Function duration | Cloud Monitoring | > 30 seconds (performance issue) |
| Slack API errors | Application logs | > 10% error rate |
| Calendar API errors | Application logs | > 5% error rate |

### Health Checks

**Daily**:
- Verify scheduler is running: `gcloud scheduler jobs describe meeting-attendance-checker`
- Check function logs for errors: `npm run logs`

**Weekly**:
- Review error logs
- Check API quotas
- Verify costs are within budget

## Limitations & Trade-offs

### Current Limitations

1. **No real-time participant tracking**
   - Uses Calendar RSVP status as proxy for attendance
   - Can't detect if someone joined after not accepting invite
   - **Reason**: Google Meet API has limited participant data (Enterprise Plus only)

2. **Email matching required**
   - Calendar email must match Slack email
   - No fuzzy matching or name-based lookup
   - **Reason**: Slack API only supports exact email lookup

3. **Time window precision**
   - Reminders sent between 1.5-2.5 minutes after meeting starts
   - Can't guarantee exactly 2 minutes
   - **Reason**: Scheduler runs every minute, not every second

4. **Single calendar user**
   - Only monitors one user's calendar
   - Can't aggregate across multiple calendars
   - **Reason**: Service account impersonates specific user

### Design Trade-offs

| Decision | Pro | Con | Rationale |
|----------|-----|-----|-----------|
| Serverless (Cloud Functions) | Low cost, auto-scaling, no infrastructure | Cold starts, execution limits | Perfect for event-driven, low-frequency tasks |
| Every-minute schedule | Simple, predictable | Not real-time | Good balance between timeliness and cost |
| Calendar RSVP as proxy | No Meet API needed, works for all tiers | Less accurate than real participants | Best available option without Enterprise Plus |
| 100ms rate limiting | Avoids Slack throttling | Slower for large meetings | Conservative approach to avoid API errors |

## Future Enhancements

### Short-term (1-2 weeks)

1. **Multiple reminder attempts**
   - Send follow-up at 5 and 10 minutes
   - Track who's been reminded to avoid duplicates

2. **Email mapping file**
   - Support custom Calendar email → Slack email mappings
   - Store in Cloud Storage

3. **Configurable reminder times**
   - Environment variable: `REMINDER_DELAY_MINUTES`
   - Per-meeting overrides via Calendar event metadata

### Medium-term (1-2 months)

1. **Attendance reports**
   - Weekly summary of attendance rates
   - Identify chronic no-shows
   - Store data in BigQuery

2. **Slack slash commands**
   - `/meeting-reminder status` - Check next scheduled reminders
   - `/meeting-reminder skip [meeting-id]` - Skip reminders for specific meeting

3. **Google Meet live participant tracking**
   - Integrate Meet API (requires Enterprise Plus)
   - Real-time attendance detection
   - More accurate than RSVP status

### Long-term (3+ months)

1. **Multi-calendar support**
   - Monitor multiple calendars
   - Aggregate across teams
   - Deduplicate attendees

2. **Smart reminders**
   - ML-based prediction of who's likely to be late
   - Personalized reminder timing
   - Historical attendance patterns

3. **Dashboard**
   - Real-time monitoring
   - Meeting analytics
   - Cost tracking

## Troubleshooting Guide

### Common Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| No DMs sent | Slack token invalid | Regenerate token in Slack API dashboard |
| "Permission denied" | Domain-wide delegation not configured | Follow SETUP.md Part 1.6 |
| Function timeout | Too many attendees | Increase timeout or optimize code |
| Duplicate messages | Multiple scheduler jobs | Delete duplicate jobs |
| Wrong timezone | Scheduler timezone mismatch | Update scheduler timezone |

### Debug Commands

```bash
# Check scheduler status
gcloud scheduler jobs describe meeting-attendance-checker --location=us-central1

# View recent logs
npm run logs

# Test function manually
curl -X POST $(gcloud functions describe checkMeetingAttendance --region=us-central1 --format='value(httpsTrigger.url)')

# Check API quotas
gcloud services list --enabled | grep calendar
```

## References

- [Google Calendar API Documentation](https://developers.google.com/calendar/api/v3/reference)
- [Slack Web API Documentation](https://api.slack.com/web)
- [Google Cloud Functions Documentation](https://cloud.google.com/functions/docs)
- [Cloud Scheduler Documentation](https://cloud.google.com/scheduler/docs)

---

**Last Updated**: 2026-03-22
**Version**: 1.0.0
