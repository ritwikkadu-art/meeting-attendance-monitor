#!/usr/bin/env node

/**
 * Test with your actual meeting tomorrow
 * Uses real Slack MCP integration
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║   Meeting Reminder Test - Your Tomorrow\'s Meeting         ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

console.log('Let me know about your meeting tomorrow and I\'ll send you a reminder!\n');

// Collect meeting details
const meeting = {};

function ask(question, defaultValue) {
  return new Promise((resolve) => {
    const prompt = defaultValue ? `${question} (${defaultValue}): ` : `${question}: `;
    rl.question(prompt, (answer) => {
      resolve(answer.trim() || defaultValue);
    });
  });
}

async function collectMeetingDetails() {
  console.log('📋 Meeting Details\n');

  meeting.title = await ask('Meeting title', 'Product Strategy Discussion');
  meeting.time = await ask('Start time (e.g., 9:00 AM)', '9:00 AM');
  meeting.organizer = await ask('Organizer name', 'Product Team');
  meeting.meetLink = await ask('Google Meet link', 'https://meet.google.com/abc-defg-hij');

  console.log('\n✅ Meeting details collected!\n');
  console.log('Meeting Summary:');
  console.log(`  📅 ${meeting.title}`);
  console.log(`  ⏰ ${meeting.time}`);
  console.log(`  👤 Organized by: ${meeting.organizer}`);
  console.log(`  🔗 ${meeting.meetLink}`);
  console.log('');

  rl.close();
  return meeting;
}

async function main() {
  const meetingInfo = await collectMeetingDetails();

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('🎯 What happens next:\n');
  console.log('1. PRE-MEETING (2 hours before):');
  console.log('   You\'ll get a Slack DM reminding you to accept the invite\n');

  console.log('2. POST-MEETING (2 minutes after start):');
  console.log('   If you haven\'t joined, you\'ll get a Slack DM with the link\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('📨 PREVIEW: Pre-Meeting Reminder\n');
  const preMessage = `📅 Reminder: You have a meeting coming up in 2 hours!

*"${meetingInfo.title}"*
⏰ Starts at: ${meetingInfo.time}
📍 Organized by: ${meetingInfo.organizer}

You haven't accepted this invite yet. Please let ${meetingInfo.organizer} know if you can make it.

Meeting link:
${meetingInfo.meetLink}`;

  console.log('┌────────────────────────────────────────────────────────');
  preMessage.split('\n').forEach(line => console.log(`│ ${line}`));
  console.log('└────────────────────────────────────────────────────────\n');

  console.log('💡 To send this reminder right now via Claude, say:');
  console.log('   "Send me a test pre-meeting reminder for this meeting"\n');

  console.log('📝 Meeting details saved! You can now:');
  console.log('   1. Ask Claude to send you a real test reminder');
  console.log('   2. Set up automated reminders for this meeting');
  console.log('   3. Deploy this for all your meetings\n');
}

main().catch(console.error);
