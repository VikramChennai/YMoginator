import { google } from "googleapis";

function getCalendarClient() {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_CALENDAR_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Google Calendar credentials not configured");
  }

  const auth = new google.auth.OAuth2(clientId, clientSecret);
  auth.setCredentials({ refresh_token: refreshToken });

  return google.calendar({
    version: "v3",
    auth,
    headers: { "x-goog-user-project": "ardent-469605" },
  });
}

/**
 * Create a calendar event for a gym time slot.
 * Returns the Google Calendar event ID.
 */
export async function createSlotEvent({
  summary,
  description,
  location,
  date,
  startTime,
  endTime,
  attendeeEmails,
}: {
  summary: string;
  description: string;
  location: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM:SS
  endTime: string; // HH:MM:SS
  attendeeEmails: string[];
}): Promise<string> {
  const calendar = getCalendarClient();

  const startDateTime = `${date}T${startTime}`;
  const endDateTime = `${date}T${endTime}`;

  const event = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary,
      description,
      location,
      start: { dateTime: startDateTime, timeZone: "America/Los_Angeles" },
      end: { dateTime: endDateTime, timeZone: "America/Los_Angeles" },
      attendees: attendeeEmails.map((email) => ({ email })),
      guestsCanModify: false,
      guestsCanInviteOthers: false,
      guestsCanSeeOtherGuests: true,
    },
    sendUpdates: "all",
  });

  return event.data.id!;
}

/**
 * Add an attendee to an existing calendar event.
 */
export async function addAttendee(eventId: string, email: string) {
  const calendar = getCalendarClient();

  const event = await calendar.events.get({
    calendarId: "primary",
    eventId,
  });

  const attendees = event.data.attendees || [];

  // Don't add duplicates
  if (attendees.some((a) => a.email === email)) return;

  attendees.push({ email });

  await calendar.events.patch({
    calendarId: "primary",
    eventId,
    requestBody: { attendees },
    sendUpdates: "all",
  });
}

/**
 * Remove an attendee from an existing calendar event.
 */
export async function removeAttendee(eventId: string, email: string) {
  const calendar = getCalendarClient();

  const event = await calendar.events.get({
    calendarId: "primary",
    eventId,
  });

  const attendees = (event.data.attendees || []).filter(
    (a) => a.email !== email
  );

  await calendar.events.patch({
    calendarId: "primary",
    eventId,
    requestBody: { attendees },
    sendUpdates: "all",
  });
}
