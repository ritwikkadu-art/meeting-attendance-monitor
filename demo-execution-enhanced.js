#!/usr/bin/env node

/**
 * Enhanced demo execution showing both pre-meeting and post-meeting reminders
 */

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║   Meeting Attendance Monitor - Enhanced Demo              ║');
console.log('║   Now with Pre-Meeting Reminders! 🎉                       ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

async function demoPreMeetingReminders() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  PART 1: Pre-Meeting Reminders (2 hours before)');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('🕐 [TIME CHECK] Current time: 2026-03-22 08:00:00');
  console.log('   Looking for meetings starting between 09:45 and 10:15\n');

  await sleep(500);

  console.log('📅 [STEP 1] Querying Google Calendar API for upcoming meetings...');
  await sleep(800);
  console.log('   ✅ Found 2 upcoming Google Meet events\n');

  const upcomingMeetings = [
    {
      id: 'meeting-003',
      summary: 'Product Strategy Review',
      start: { dateTime: '2026-03-22T10:00:00.000Z' },
      hangoutLink: 'https://meet.google.com/prd-strg-rev',
      organizer: { email: 'product@company.com', displayName: 'Product Manager' },
      attendees: [
        { email: 'alice@company.com', responseStatus: 'accepted' },
        { email: 'bob@company.com', responseStatus: 'needsAction' },
        { email: 'charlie@company.com', responseStatus: 'tentative' },
      ]
    },
    {
      id: 'meeting-004',
      summary: 'Engineering Sync',
      start: { dateTime: '2026-03-22T10:00:00.000Z' },
      hangoutLink: 'https://meet.google.com/eng-sync-wk',
      organizer: { email: 'tech-lead@company.com', displayName: 'Tech Lead' },
      attendees: [
        { email: 'diana@company.com', responseStatus: 'needsAction' },
        { email: 'eve@company.com', responseStatus: 'accepted' }
      ]
    }
  ];

  for (const meeting of upcomingMeetings) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📋 Processing: "${meeting.summary}"`);
    console.log(`${'─'.repeat(60)}\n`);

    const startTime = new Date(meeting.start.dateTime);
    console.log(`   Starts at: ${startTime.toLocaleTimeString()}`);
    console.log(`   Organizer: ${meeting.organizer.displayName}\n`);

    const nonResponders = meeting.attendees.filter(a => a.responseStatus !== 'accepted');
    console.log(`👥 Non-responders: ${nonResponders.length}/${meeting.attendees.length}\n`);

    for (const attendee of nonResponders) {
      console.log(`   ┌─ Processing: ${attendee.email}`);
      console.log(`   │  Status: ${attendee.responseStatus}`);
      await sleep(300);

      console.log(`   │  [ACTION] Sending pre-meeting reminder...`);
      await sleep(400);

      const slackUserId = 'U' + Math.random().toString(36).substr(2, 9).toUpperCase();
      console.log(`   │  ✅ Sent to Slack user ${slackUserId}\n`);

      const message = `📅 Reminder: You have a meeting coming up in 2 hours!

*"${meeting.summary}"*
⏰ Starts at: ${startTime.toLocaleTimeString()}
📍 Organized by: ${meeting.organizer.displayName}

You haven't accepted this invite yet. Please let ${meeting.organizer.displayName} know if you can make it.

Meeting link:
${meeting.hangoutLink}`;

      console.log(`   │  📨 Message:`);
      console.log(`   │  ┌${'─'.repeat(56)}`);
      message.split('\n').forEach(line => {
        console.log(`   │  │ ${line}`);
      });
      console.log(`   │  └${'─'.repeat(56)}`);
      console.log(`   └─ ✅ Done\n`);

      await sleep(100);
    }
  }

  console.log('\n📊 [PRE-MEETING SUMMARY]');
  console.log('   • Upcoming meetings: 2');
  console.log('   • Pre-meeting reminders sent: 3');
  console.log('   • Failed: 0\n');

  await sleep(1000);
}

async function demoPostMeetingReminders() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  PART 2: Post-Meeting Reminders (2 minutes after)');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('🕐 [TIME CHECK] Current time: 2026-03-22 10:02:00');
  console.log('   Looking for meetings started between 10:00:00 and 10:01:00\n');

  await sleep(500);

  console.log('📅 [STEP 1] Querying Google Calendar API...');
  await sleep(800);
  console.log('   ✅ Found 1 Google Meet event that started 2 minutes ago\n');

  const startedMeeting = {
    id: 'meeting-005',
    summary: 'Daily Standup',
    start: { dateTime: '2026-03-22T10:00:00.000Z' },
    hangoutLink: 'https://meet.google.com/daily-standup',
    organizer: { email: 'scrum@company.com', displayName: 'Scrum Master' },
    attendees: [
      { email: 'alice@company.com', responseStatus: 'accepted' },
      { email: 'bob@company.com', responseStatus: 'needsAction' },
      { email: 'charlie@company.com', responseStatus: 'accepted' }
    ]
  };

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`📋 Processing: "${startedMeeting.summary}"`);
  console.log(`${'─'.repeat(60)}\n`);

  const nonAttendees = startedMeeting.attendees.filter(a => a.responseStatus !== 'accepted');
  console.log(`👥 Non-attendees: ${nonAttendees.length}/${startedMeeting.attendees.length}\n`);

  for (const attendee of nonAttendees) {
    console.log(`   ┌─ Processing: ${attendee.email}`);
    console.log(`   │  Status: ${attendee.responseStatus}`);
    await sleep(300);

    console.log(`   │  [ACTION] Sending post-meeting reminder...`);
    await sleep(400);

    const slackUserId = 'U' + Math.random().toString(36).substr(2, 9).toUpperCase();
    console.log(`   │  ✅ Sent to Slack user ${slackUserId}\n`);

    const message = `👋 Hi! The meeting "${startedMeeting.summary}" started 2 minutes ago.

It looks like you haven't joined yet. Here's the link if you need it:
${startedMeeting.hangoutLink}

Meeting organized by ${startedMeeting.organizer.displayName}`;

    console.log(`   │  📨 Message:`);
    console.log(`   │  ┌${'─'.repeat(56)}`);
    message.split('\n').forEach(line => {
      console.log(`   │  │ ${line}`);
    });
    console.log(`   │  └${'─'.repeat(56)}`);
    console.log(`   └─ ✅ Done\n`);

    await sleep(100);
  }

  console.log('\n📊 [POST-MEETING SUMMARY]');
  console.log('   • Started meetings: 1');
  console.log('   • Post-meeting reminders sent: 1');
  console.log('   • Failed: 0\n');
}

async function demoComparison() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║   Feature Comparison                                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('┌─────────────────────────┬──────────────────┬──────────────────┐');
  console.log('│ Feature                 │ Pre-Meeting      │ Post-Meeting     │');
  console.log('├─────────────────────────┼──────────────────┼──────────────────┤');
  console.log('│ When                    │ 2 hours before   │ 2 minutes after  │');
  console.log('│ Frequency               │ Every 15 min     │ Every minute     │');
  console.log('│ Target                  │ Non-responders   │ Non-attendees    │');
  console.log('│ Purpose                 │ Get RSVP         │ Join now         │');
  console.log('│ Skip declined           │ Yes              │ Yes              │');
  console.log('│ Configurable            │ Yes              │ Yes              │');
  console.log('└─────────────────────────┴──────────────────┴──────────────────┘\n');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the demo
(async function main() {
  await demoPreMeetingReminders();
  await sleep(500);
  await demoPostMeetingReminders();
  await sleep(500);
  await demoComparison();

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   ✅ Enhanced Demo Complete!                               ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('💡 Next Steps:\n');
  console.log('1. Configure reminder timing in .env.yaml:');
  console.log('   PRE_MEETING_REMINDER_HOURS: "2"    # Default: 2 hours');
  console.log('   POST_MEETING_REMINDER_MINUTES: "2" # Default: 2 minutes\n');
  console.log('2. Deploy both functions:');
  console.log('   ./deploy.sh\n');
  console.log('3. Test locally:');
  console.log('   curl -X POST http://localhost:8080/         # Post-meeting');
  console.log('   curl -X POST http://localhost:8080/pre-meeting  # Pre-meeting\n');

})().catch(error => {
  console.error('❌ Demo failed:', error);
  process.exit(1);
});
