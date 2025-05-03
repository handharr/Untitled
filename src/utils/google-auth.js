import { google } from "googleapis";
import readline from "readline";
import { google } from "googleapis";
import readline from "readline";

const CREDENTIALS_PATH = "credentials.json";
const TOKEN_PATH = "token.json";

const SCOPES = ["https://www.googleapis.com/auth/drive.file"];

async function uploadToDrive(auth, filename) {
  const drive = google.drive({ version: "v3", auth });
  const fileMetadata = {
    name: filename,
    parents: ["appDataFolder"], // Optional: replace with folder ID if needed
  };
  const media = {
    mimeType: "text/csv",
    body: fs.createReadStream(filename),
  };

  const file = await drive.files.create({
    resource: fileMetadata,
    media: media,
    fields: "id",
  });

  console.log(`File uploaded to Google Drive with ID: ${file.data.id}`);
}

async function getAuthenticatedClient() {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
    oAuth2Client.setCredentials(token);
    return oAuth2Client;
  }

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
  });

  console.log("Authorize this app by visiting this URL:", authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const code = await new Promise((resolve) =>
    rl.question("Enter the code here: ", (code) => {
      rl.close();
      resolve(code);
    })
  );

  const token = (await oAuth2Client.getToken(code)).tokens;
  oAuth2Client.setCredentials(token);
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
  console.log("Token stored to", TOKEN_PATH);
  return oAuth2Client;
}
