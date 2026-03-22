#!/usr/bin/env node

/**
 * Demo execution of the meeting attendance monitor
 * Simulates the workflow without requiring actual API credentials
 */

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║   Meeting Attendance Monitor - Demo Execution             ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// Simulate the workflow
async function demoExecution() {
  console.log('🕐 [TIME CHECK] Current time: 2026-03-22 10:02:00');
  console.log('   Looking for meetings started between 10:00:00 and 10:01:00\n');

  await sleep(500);

  // Step 1: Query Calendar API
  console.log('📅 [STEP 1] Querying Google Calendar API...');
  console.log('   → calendar.events.list({');
  console.log('       calendarId: "primary",');
  console.log('       timeMin: "2026-03-22T10:00:00.000Z",');
  console.log('       timeMax: "2026-03-22T10:01:00.000Z"');
  console.log('     })');
  await sleep(800);
  console.log('   ✅ Found 2 Google Meet events\n');

  // Mock meeting data
  const meetings = [
    {
      id: 'meeting-001',
      summary: 'Weekly Team Sync',
      start: { dateTime: '2026-03-22T10:00:00.000Z' },
      hangoutLink: 'https://meet.google.com/abc-defg-hij',
      organizer: { email: 'manager@company.com', displayName: 'Alice Manager' },
      attendees: [
        { email: 'alice@company.com', responseStatus: 'accepted' },
        { email: 'bob@company.com', responseStatus: 'needsAction' },
        { email: 'charlie@company.com', responseStatus: 'accepted' },
        { email: 'diana@company.com', responseStatus: 'needsAction' },
        { email: 'eve@company.com', responseStatus: 'tentative' }
      ]
    },
    {
      id: 'meeting-002',
      summary: '1:1 with Product',
      start: { dateTime: '2026-03-22T10:00:00.000Z' },
      hangoutLink: 'https://meet.google.com/xyz-abcd-efg',
      organizer: { email: 'product@company.com', displayName: 'Product Manager' },
      attendees: [
        { email: 'frank@company.com', responseStatus: 'accepted' },
        { email: 'grace@company.com', responseStatus: 'needsAction' }
      ]
    }
  ];

  // Process each meeting
  for (let i = 0; i < meetings.length; i++) {
    const meeting = meetings[i];
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📋 [MEETING ${i + 1}] Processing: "${meeting.summary}"`);
    console.log(`${'='.repeat(60)}\n`);

    console.log(`   Meeting ID: ${meeting.id}`);
    console.log(`   Start time: ${meeting.start.dateTime}`);
    console.log(`   Join link: ${meeting.hangoutLink}`);
    console.log(`   Organized by: ${meeting.organizer.displayName}\n`);

    // Step 2: Get non-attendees
    const nonAttendees = meeting.attendees.filter(a => a.responseStatus !== 'accepted');
    console.log(`👥 [STEP 2] Analyzing attendees...`);
    console.log(`   Total invited: ${meeting.attendees.length}`);
    console.log(`   Accepted: ${meeting.attendees.filter(a => a.responseStatus === 'accepted').length}`);
    console.log(`   Non-accepted: ${nonAttendees.length}\n`);

    // Step 3 & 4: Process each non-attendee
    for (const attendee of nonAttendees) {
      console.log(`   ┌─ Processing: ${attendee.email}`);
      console.log(`   │  RSVP Status: ${attendee.responseStatus}`);
      await sleep(300);

      // Step 3: Look up Slack user
      console.log(`   │  [STEP 3] Looking up Slack user...`);
      console.log(`   │  → slack.users.lookupByEmail("${attendee.email}")`);
      await sleep(400);

      const slackUserId = 'U' + Math.random().toString(36).substr(2, 9).toUpperCase();
      console.log(`   │  ✅ Found: ${slackUserId}\n`);

      // Step 4: Send Slack DM
      const message = createMockMessage(meeting, attendee);
      console.log(`   │  [STEP 4] Sending Slack DM...`);
      console.log(`   │  → slack.chat.postMessage({`);
      console.log(`   │      channel: "${slackUserId}",`);
      console.log(`   │      text: <message>`);
      console.log(`   │    })`);
      await sleep(400);
      console.log(`   │  ✅ DM sent successfully\n`);

      console.log(`   │  📨 Message preview:`);
      console.log(`   │  ┌${'─'.repeat(56)}`);
      message.split('\n').forEach(line => {
        console.log(`   │  │ ${line}`);
      });
      console.log(`   │  └${'─'.repeat(56)}`);
      console.log(`   └─ ✅ Processed ${attendee.email}\n`);

      await sleep(100); // Rate limiting
    }

    console.log(`   ✅ Completed processing "${meeting.summary}"`);
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 [SUMMARY] Execution complete');
  console.log(`${'='.repeat(60)}\n`);

  const totalNonAttendees = meetings.reduce((sum, m) =>
    sum + m.attendees.filter(a => a.responseStatus !== 'accepted').length, 0
  );

  console.log('   Metrics:');
  console.log(`   • Meetings processed: ${meetings.length}`);
  console.log(`   • Total attendees checked: ${meetings.reduce((sum, m) => sum + m.attendees.length, 0)}`);
  console.log(`   • Reminders sent: ${totalNonAttendees}`);
  console.log(`   • Failed: 0`);
  console.log(`   • Execution time: ~${Math.round((totalNonAttendees * 0.8) + 1.5)}s\n`);

  // Return response
  const response = {
    success: true,
    meetings: meetings.length,
    remindersSent: totalNonAttendees,
    remindersFailed: 0,
    timestamp: new Date().toISOString()
  };

  console.log('📤 [RESPONSE]');
  console.log(JSON.stringify(response, null, 2));
  console.log('');
}

function createMockMessage(meeting, attendee) {
  return `👋 Hi! The meeting "${meeting.summary}" started 2 minutes ago.

It looks like you haven't joined yet. Here's the link if you need it:
${meeting.hangoutLink}

Meeting organized by ${meeting.organizer.displayName}`;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the demo
demoExecution()
  .then(() => {
    console.log('✅ Demo execution completed successfully\n');
    console.log('💡 Next steps:');
    console.log('   1. Follow SETUP.md to configure Google Cloud and Slack');
    console.log('   2. Add your credentials to .env.yaml');
    console.log('   3. Deploy with: ./deploy.sh');
    console.log('   4. Test live with: npm test\n');
  })
  .catch(error => {
    console.error('❌ Demo execution failed:', error);
    process.exit(1);
  });
