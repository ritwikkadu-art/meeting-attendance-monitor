#!/usr/bin/env node

const { google } = require('googleapis');

async function fetchTomorrowsMeetings() {
  try {
    // Load service account and impersonate user
    const auth = new google.auth.GoogleAuth({
      keyFile: './service-account-key.json',
      scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
      clientOptions: {
        subject: 'ritwik.kadu@razorpay.com', // User to impersonate
      },
    });

    const calendar = google.calendar({ version: 'v3', auth });

    // Get tomorrow's date range
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const timeMin = new Date(tomorrow.setHours(0, 0, 0, 0)).toISOString();
    const timeMax = new Date(tomorrow.setHours(23, 59, 59, 999)).toISOString();

    console.log('Fetching meetings for tomorrow...');
    console.log(`Time range: ${timeMin} to ${timeMax}\n`);

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items || [];

    if (events.length === 0) {
      console.log('No meetings found for tomorrow.');
      return [];
    }

    console.log(`Found ${events.length} meeting(s) tomorrow:\n`);

    events.forEach((event, index) => {
      const start = event.start.dateTime || event.start.date;
      const meetLink = event.hangoutLink || event.conferenceData?.entryPoints?.[0]?.uri || 'No link';
      const organizer = event.organizer?.displayName || event.organizer?.email || 'Unknown';

      console.log(`${index + 1}. ${event.summary || 'Untitled'}`);
      console.log(`   Time: ${new Date(start).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`   Organizer: ${organizer}`);
      console.log(`   Meet link: ${meetLink}`);

      if (event.attendees && event.attendees.length > 0) {
        const nonAccepted = event.attendees.filter(a => a.responseStatus !== 'accepted');
        console.log(`   Attendees: ${event.attendees.length} (${nonAccepted.length} haven't accepted)`);
      }
      console.log('');
    });

    return events;
  } catch (error) {
    console.error('Error fetching calendar:', error.message);
    if (error.code === 403) {
      console.error('\n💡 This might be a quota/permission issue.');
      console.error('   The ADC credentials may need a proper GCP project with Calendar API enabled.');
    }
    throw error;
  }
}

fetchTomorrowsMeetings();
