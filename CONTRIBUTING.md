# Contributing to Meeting Attendance Monitor

Thanks for contributing to this Razorpay internal tool! 🎉

## Getting Started

### Prerequisites

- Node.js 18+
- Access to Razorpay GitHub org
- Google Cloud SDK (for deployment testing)

### Setup

```bash
# Clone the repo
git clone https://github.com/razorpay/meeting-attendance-monitor.git
cd meeting-attendance-monitor

# Install dependencies
npm install

# Run demo (no credentials needed)
node demo-execution.js
```

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
```

**Branch naming:**
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring

### 2. Make Changes

**Code style:**
- Use ES6+ features
- Add comments for complex logic
- Keep functions small and focused
- Handle errors gracefully

**Testing:**
```bash
# Test your changes locally
npm test

# Run demo to see the flow
node demo-execution.js
```

### 3. Commit

```bash
git add .
git commit -m "feat: add support for custom reminder times"
```

**Commit message format:**
```
<type>: <description>

[optional body]
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `refactor` - Code refactoring
- `test` - Tests
- `chore` - Maintenance

**Examples:**
```
feat: add support for multiple reminder attempts
fix: handle users not found in Slack gracefully
docs: update setup guide with screenshots
refactor: extract message creation to separate function
```

### 4. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

## Pull Request Guidelines

### PR Title

Use the same format as commit messages:
```
feat: add weekly attendance reports
```

### PR Description

Include:
1. **What** - What changes are you making?
2. **Why** - Why are these changes needed?
3. **How** - How did you implement it?
4. **Testing** - How did you test it?

**Template:**
```markdown
## Summary
Brief description of the changes

## Motivation
Why is this change needed?

## Changes
- List of changes
- Another change

## Testing
- [ ] Tested locally
- [ ] Ran demo execution
- [ ] Tested with real credentials (if applicable)

## Screenshots (if applicable)
Add screenshots or logs showing the feature working
```

### Review Process

1. At least 1 approval required
2. All CI checks must pass
3. No merge conflicts
4. Code follows style guidelines

## Common Contributions

### Adding a New Feature

**Example: Multiple reminder attempts**

```javascript
// 1. Add configuration
const REMINDER_TIMES = [2, 5, 10]; // minutes

// 2. Modify getMeetingsStartedNMinutesAgo
function getMeetingsStartedNMinutesAgo(minutes) {
  const targetTime = new Date(Date.now() - minutes * 60 * 1000);
  // ... rest of implementation
}

// 3. Track sent reminders (avoid duplicates)
const sentReminders = new Map(); // Store in Cloud Storage for persistence

// 4. Update main function
for (const minutes of REMINDER_TIMES) {
  const meetings = await getMeetingsStartedNMinutesAgo(minutes);
  // ... process meetings
}
```

### Fixing a Bug

**Example: Handle Slack rate limits**

```javascript
// Before (no retry)
await slack.chat.postMessage({ ... });

// After (with retry)
async function sendWithRetry(options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await slack.chat.postMessage(options);
    } catch (error) {
      if (error.data?.error === 'rate_limited') {
        const delay = Math.pow(2, i) * 1000; // Exponential backoff
        await sleep(delay);
        continue;
      }
      throw error;
    }
  }
}
```

### Updating Documentation

**What to document:**
- New features and how to use them
- Configuration options
- API changes
- Deployment steps
- Troubleshooting common issues

**Where:**
- `README.md` - Main user-facing docs
- `README-RAZORPAY.md` - Razorpay-specific setup
- `SETUP.md` - Installation guide
- `ARCHITECTURE.md` - Technical design
- Code comments - Complex logic

## Testing

### Local Testing

```bash
# 1. Set up test environment
cp .env.example .env
# Edit .env with test credentials

# 2. Run test
npm test

# 3. Test specific function
node -e "require('./index.js').checkMeetingAttendance()"
```

### Integration Testing

Before deploying to production, test in a staging environment:

```bash
# Deploy to staging
gcloud functions deploy checkMeetingAttendance-staging \
  --runtime nodejs20 \
  --trigger-http \
  --env-vars-file .env.yaml \
  --region us-central1

# Test manually
curl -X POST <staging-function-url>

# Check logs
gcloud functions logs read checkMeetingAttendance-staging --limit=20
```

## Code Style

### JavaScript Style

```javascript
// ✅ Good
async function processMeeting(event) {
  const attendees = getNonAttendees(event);

  for (const attendee of attendees) {
    try {
      await sendReminder(attendee);
    } catch (error) {
      console.error(`Failed to send reminder to ${attendee.email}:`, error);
    }
  }
}

// ❌ Bad
async function processMeeting(event) {
  var attendees = getNonAttendees(event)
  for(var i=0;i<attendees.length;i++){
    await sendReminder(attendees[i])
  }
}
```

### Logging

```javascript
// ✅ Good - Structured logging
console.log(`Processing meeting: "${event.summary}"`);
console.log(`Found ${nonAttendees.length} non-attendees`);
console.error(`Failed to send reminder to ${email}:`, error);

// ❌ Bad - Unstructured
console.log('processing');
console.log(event);
console.log('error', error);
```

### Error Handling

```javascript
// ✅ Good - Graceful degradation
try {
  const slackUser = await findSlackUserByEmail(email);
  if (!slackUser) {
    console.log(`Skipping ${email} - not found in Slack`);
    return;
  }
  await sendSlackDM(slackUser.id, message);
} catch (error) {
  console.error(`Error processing ${email}:`, error);
  // Continue with next attendee
}

// ❌ Bad - Crash on error
const slackUser = await findSlackUserByEmail(email);
await sendSlackDM(slackUser.id, message); // Will crash if slackUser is null
```

## Architecture Decisions

When making significant changes:

1. **Document why** - Add comments explaining the reasoning
2. **Consider backwards compatibility** - Don't break existing deployments
3. **Think about scale** - Will this work for 1000+ meetings/day?
4. **Security first** - Don't expose credentials or PII

## Release Process

1. All changes go through PR review
2. Merge to `main` triggers auto-deployment via GitHub Actions
3. Monitor logs for 10 minutes after deployment
4. Rollback if errors detected

### Manual Rollback

```bash
# List recent deployments
gcloud functions deploy checkMeetingAttendance \
  --list-deploy-versions \
  --project=razorpay-meeting-monitor

# Rollback to previous version
gcloud functions deploy checkMeetingAttendance \
  --version=<previous-version> \
  --project=razorpay-meeting-monitor
```

## Questions?

- Ask in #tech-internal Slack channel
- Open a GitHub Discussion
- Tag @ritwik.kadu for urgent issues

---

Happy coding! 🚀
