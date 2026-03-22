const { google } = require('googleapis');
const { WebClient } = require('@slack/web-api');

// Initialize Slack client
const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

// Service account configuration
const SERVICE_ACCOUNT_EMAIL = process.env.SERVICE_ACCOUNT_EMAIL;
const CALENDAR_USER_EMAIL = process.env.GOOGLE_CALENDAR_USER_EMAIL;

// Configurable reminder times
const PRE_MEETING_REMINDER_HOURS = parseInt(process.env.PRE_MEETING_REMINDER_HOURS || '2'); // Default: 2 hours before
const POST_MEETING_REMINDER_MINUTES = parseInt(process.env.POST_MEETING_REMINDER_MINUTES || '2'); // Default: 2 minutes after

/**
 * Gets Google Calendar API client with domain-wide delegation
 */
function getCalendarClient() {
  // In Cloud Functions, service account credentials are automatically available
  const auth = new google.auth.GoogleAuth({
    scopes: [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/admin.directory.user.readonly'
    ],
    // Use the service account key from Secret Manager
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS || '/tmp/service-account-key.json'
  });

  // Create a JWT client with domain-wide delegation
  const jwtClient = new google.auth.JWT({
    email: SERVICE_ACCOUNT_EMAIL,
    key: process.env.SERVICE_ACCOUNT_KEY,
    scopes: [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/admin.directory.user.readonly'
    ],
    subject: CALENDAR_USER_EMAIL // Impersonate this user
  });

  return google.calendar({ version: 'v3', auth: jwtClient });
}

/**
 * Gets events that started approximately 2 minutes ago
 */
async function getMeetingsStarted2MinutesAgo() {
  const calendar = getCalendarClient();
  const now = new Date();

  // Look for events that started between 1.5 and 2.5 minutes ago
  const twoMinutesAgo = new Date(now.getTime() - POST_MEETING_REMINDER_MINUTES * 60 * 1000);
  const startTimeMin = new Date(twoMinutesAgo.getTime() - 30 * 1000);
  const startTimeMax = new Date(twoMinutesAgo.getTime() + 30 * 1000);

  console.log(`Looking for meetings started between ${startTimeMin.toISOString()} and ${startTimeMax.toISOString()}`);

  try {
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: startTimeMin.toISOString(),
      timeMax: startTimeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items || [];

    // Filter for events with Google Meet links
    const meetEvents = events.filter(event => {
      const hasConferenceData = event.conferenceData && event.conferenceData.entryPoints;
      const hasHangoutLink = event.hangoutLink;
      return hasConferenceData || hasHangoutLink;
    });

    console.log(`Found ${meetEvents.length} Google Meet events that started ~${POST_MEETING_REMINDER_MINUTES} minutes ago`);
    return meetEvents;
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    throw error;
  }
}

/**
 * Gets events that are starting in approximately N hours
 */
async function getUpcomingMeetings(hoursAhead) {
  const calendar = getCalendarClient();
  const now = new Date();

  // Look for events starting in hoursAhead hours (±15 minutes window)
  const targetTime = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);
  const startTimeMin = new Date(targetTime.getTime() - 15 * 60 * 1000); // 15 min before
  const startTimeMax = new Date(targetTime.getTime() + 15 * 60 * 1000); // 15 min after

  console.log(`Looking for meetings starting between ${startTimeMin.toISOString()} and ${startTimeMax.toISOString()}`);

  try {
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: startTimeMin.toISOString(),
      timeMax: startTimeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items || [];

    // Filter for events with Google Meet links
    const meetEvents = events.filter(event => {
      const hasConferenceData = event.conferenceData && event.conferenceData.entryPoints;
      const hasHangoutLink = event.hangoutLink;
      return hasConferenceData || hasHangoutLink;
    });

    console.log(`Found ${meetEvents.length} Google Meet events starting in ~${hoursAhead} hours`);
    return meetEvents;
  } catch (error) {
    console.error('Error fetching upcoming calendar events:', error);
    throw error;
  }
}

/**
 * Gets attendees who haven't accepted the meeting invite
 * (assumes non-acceptance means they haven't joined)
 */
function getNonAttendees(event) {
  if (!event.attendees) {
    console.log(`Event "${event.summary}" has no attendees listed`);
    return [];
  }

  // Filter attendees who haven't accepted
  // responseStatus can be: 'needsAction', 'declined', 'tentative', 'accepted'
  const nonAttendees = event.attendees.filter(attendee => {
    const status = attendee.responseStatus;
    // Consider anyone who hasn't accepted as not attending
    return status !== 'accepted';
  });

  console.log(`Event "${event.summary}": ${nonAttendees.length}/${event.attendees.length} attendees haven't accepted`);
  return nonAttendees;
}

/**
 * Finds Slack user by email address
 */
async function findSlackUserByEmail(email) {
  try {
    const result = await slack.users.lookupByEmail({ email });
    return result.user;
  } catch (error) {
    if (error.data && error.data.error === 'users_not_found') {
      console.log(`No Slack user found for email: ${email}`);
      return null;
    }
    console.error(`Error looking up Slack user for ${email}:`, error);
    throw error;
  }
}

/**
 * Sends a Slack DM to a user
 */
async function sendSlackDM(userId, message) {
  try {
    const result = await slack.chat.postMessage({
      channel: userId,
      text: message,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: message
          }
        }
      ]
    });
    console.log(`Sent DM to user ${userId}`);
    return result;
  } catch (error) {
    console.error(`Error sending Slack DM to ${userId}:`, error);
    throw error;
  }
}

/**
 * Processes a single meeting event (post-meeting reminder)
 */
async function processMeeting(event) {
  console.log(`\nProcessing meeting: "${event.summary}"`);
  console.log(`Meeting start time: ${event.start.dateTime || event.start.date}`);

  const nonAttendees = getNonAttendees(event);

  if (nonAttendees.length === 0) {
    console.log('All attendees have accepted. No reminders needed.');
    return { sent: 0, failed: 0 };
  }

  let sentCount = 0;
  let failedCount = 0;

  for (const attendee of nonAttendees) {
    const email = attendee.email;
    console.log(`Processing attendee: ${email} (status: ${attendee.responseStatus})`);

    try {
      // Find Slack user
      const slackUser = await findSlackUserByEmail(email);

      if (!slackUser) {
        console.log(`Skipping ${email} - not found in Slack`);
        failedCount++;
        continue;
      }

      // Create personalized message
      const meetingLink = event.hangoutLink ||
                         (event.conferenceData?.entryPoints?.[0]?.uri) ||
                         event.htmlLink;

      const message = createPostMeetingReminderMessage(event, meetingLink, attendee);

      // Send DM
      await sendSlackDM(slackUser.id, message);
      sentCount++;

      // Rate limiting - avoid hitting Slack API limits
      await sleep(100);
    } catch (error) {
      console.error(`Failed to send reminder to ${email}:`, error);
      failedCount++;
    }
  }

  return { sent: sentCount, failed: failedCount };
}

/**
 * Processes upcoming meeting (pre-meeting reminder)
 */
async function processUpcomingMeeting(event, hoursAhead) {
  console.log(`\nProcessing upcoming meeting: "${event.summary}"`);
  console.log(`Meeting start time: ${event.start.dateTime || event.start.date}`);

  const nonResponders = getNonAttendees(event);

  if (nonResponders.length === 0) {
    console.log('All attendees have responded. No reminders needed.');
    return { sent: 0, failed: 0 };
  }

  let sentCount = 0;
  let failedCount = 0;

  for (const attendee of nonResponders) {
    const email = attendee.email;
    console.log(`Processing attendee: ${email} (status: ${attendee.responseStatus})`);

    // Skip if they've declined - respect their decision
    if (attendee.responseStatus === 'declined') {
      console.log(`Skipping ${email} - already declined`);
      continue;
    }

    try {
      // Find Slack user
      const slackUser = await findSlackUserByEmail(email);

      if (!slackUser) {
        console.log(`Skipping ${email} - not found in Slack`);
        failedCount++;
        continue;
      }

      // Create personalized message
      const meetingLink = event.hangoutLink ||
                         (event.conferenceData?.entryPoints?.[0]?.uri) ||
                         event.htmlLink;

      const message = createPreMeetingReminderMessage(event, meetingLink, attendee, hoursAhead);

      // Send DM
      await sendSlackDM(slackUser.id, message);
      sentCount++;

      // Rate limiting - avoid hitting Slack API limits
      await sleep(100);
    } catch (error) {
      console.error(`Failed to send pre-meeting reminder to ${email}:`, error);
      failedCount++;
    }
  }

  return { sent: sentCount, failed: failedCount };
}

/**
 * Creates the pre-meeting reminder message text
 */
function createPreMeetingReminderMessage(event, meetingLink, attendee, hoursAhead) {
  const meetingTitle = event.summary || 'Untitled Meeting';
  const organizerName = event.organizer?.displayName || event.organizer?.email || 'the organizer';
  const startTime = new Date(event.start.dateTime || event.start.date);
  const timeStr = startTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  return `📅 Reminder: You have a meeting coming up in ${hoursAhead} hours!

*"${meetingTitle}"*
⏰ Starts at: ${timeStr}
📍 Organized by: ${organizerName}

You haven't accepted this invite yet. Please let ${organizerName} know if you can make it.

Meeting link:
${meetingLink}`;
}

/**
 * Creates the post-meeting reminder message text (already started)
 */
function createPostMeetingReminderMessage(event, meetingLink, attendee) {
  const meetingTitle = event.summary || 'Untitled Meeting';
  const organizerName = event.organizer?.displayName || event.organizer?.email || 'the organizer';

  return `👋 Hi! The meeting *"${meetingTitle}"* started ${POST_MEETING_REMINDER_MINUTES} minutes ago.

It looks like you haven't joined yet. Here's the link if you need it:
${meetingLink}

_Meeting organized by ${organizerName}_`;
}

/**
 * Utility function to sleep for ms milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main Cloud Function entry point - Post-meeting reminders
 */
exports.checkMeetingAttendance = async (req, res) => {
  console.log('=== Post-Meeting Attendance Check Started ===');
  console.log(`Timestamp: ${new Date().toISOString()}`);

  try {
    // Get meetings that started N minutes ago
    const meetings = await getMeetingsStarted2MinutesAgo();

    if (meetings.length === 0) {
      console.log(`No meetings found that started ${POST_MEETING_REMINDER_MINUTES} minutes ago`);
      res.status(200).json({
        success: true,
        message: 'No meetings to process',
        meetings: 0
      });
      return;
    }

    // Process each meeting
    let totalSent = 0;
    let totalFailed = 0;

    for (const meeting of meetings) {
      const result = await processMeeting(meeting);
      totalSent += result.sent;
      totalFailed += result.failed;
    }

    console.log(`\n=== Summary ===`);
    console.log(`Meetings processed: ${meetings.length}`);
    console.log(`Reminders sent: ${totalSent}`);
    console.log(`Failed: ${totalFailed}`);

    res.status(200).json({
      success: true,
      type: 'post-meeting',
      meetings: meetings.length,
      remindersSent: totalSent,
      remindersFailed: totalFailed
    });
  } catch (error) {
    console.error('Error in checkMeetingAttendance:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Cloud Function entry point - Pre-meeting reminders
 */
exports.sendPreMeetingReminders = async (req, res) => {
  console.log('=== Pre-Meeting Reminder Check Started ===');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Checking for meetings in ${PRE_MEETING_REMINDER_HOURS} hours`);

  try {
    // Get meetings starting in N hours
    const meetings = await getUpcomingMeetings(PRE_MEETING_REMINDER_HOURS);

    if (meetings.length === 0) {
      console.log(`No meetings found starting in ${PRE_MEETING_REMINDER_HOURS} hours`);
      res.status(200).json({
        success: true,
        message: 'No upcoming meetings to process',
        meetings: 0
      });
      return;
    }

    // Process each meeting
    let totalSent = 0;
    let totalFailed = 0;

    for (const meeting of meetings) {
      const result = await processUpcomingMeeting(meeting, PRE_MEETING_REMINDER_HOURS);
      totalSent += result.sent;
      totalFailed += result.failed;
    }

    console.log(`\n=== Summary ===`);
    console.log(`Upcoming meetings processed: ${meetings.length}`);
    console.log(`Pre-meeting reminders sent: ${totalSent}`);
    console.log(`Failed: ${totalFailed}`);

    res.status(200).json({
      success: true,
      type: 'pre-meeting',
      hoursAhead: PRE_MEETING_REMINDER_HOURS,
      meetings: meetings.length,
      remindersSent: totalSent,
      remindersFailed: totalFailed
    });
  } catch (error) {
    console.error('Error in sendPreMeetingReminders:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * For local testing
 */
if (require.main === module) {
  const http = require('http');
  const port = process.env.PORT || 8080;

  const server = http.createServer((req, res) => {
    // Route based on URL path
    const url = new URL(req.url, `http://localhost:${port}`);

    if (url.pathname === '/pre-meeting') {
      exports.sendPreMeetingReminders(req, res);
    } else {
      exports.checkMeetingAttendance(req, res);
    }
  });

  server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
    console.log('');
    console.log('Endpoints:');
    console.log('  POST /              - Check post-meeting attendance (already started)');
    console.log('  POST /pre-meeting   - Send pre-meeting reminders (upcoming)');
    console.log('');
    console.log('Examples:');
    console.log(`  curl -X POST http://localhost:${port}/`);
    console.log(`  curl -X POST http://localhost:${port}/pre-meeting`);
  });
}
