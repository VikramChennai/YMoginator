/**
 * One-time script to get a Google OAuth refresh token with Calendar scope.
 * Run: node scripts/get-calendar-token.js
 * Then open the URL in your browser, authorize, and paste the code back.
 */
const http = require("http");
const { google } = require("googleapis");

// Using gcloud's own OAuth client (already authorized for this user)
const CLIENT_ID = "764086051850-6qr4p6gpi6hn506pt8ejuq83di341hur.apps.googleusercontent.com";
const CLIENT_SECRET = "d-FL95Q19q7MQmFpd7hHD0Ty";
const REDIRECT_URI = "http://localhost:9876";

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: [
    "https://www.googleapis.com/auth/calendar",
  ],
});

console.log("\nOpen this URL in your browser:\n");
console.log(authUrl);
console.log("\nWaiting for authorization...\n");

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:9876`);
  const code = url.searchParams.get("code");

  if (!code) {
    res.writeHead(400);
    res.end("No code received");
    return;
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    console.log("=== SUCCESS ===");
    console.log("Refresh token:", tokens.refresh_token);
    console.log("\nAdd this to your .env file:");
    console.log(`GOOGLE_CALENDAR_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log(`GOOGLE_CALENDAR_CLIENT_ID=${CLIENT_ID}`);
    console.log(`GOOGLE_CALENDAR_CLIENT_SECRET=${CLIENT_SECRET}`);

    res.writeHead(200, { "Content-Type": "text/html" });
    res.end("<h1>Success!</h1><p>You can close this window. Check your terminal for the token.</p>");
  } catch (err) {
    console.error("Error exchanging code:", err.message);
    res.writeHead(500);
    res.end("Error: " + err.message);
  }

  server.close();
});

server.listen(9876);
