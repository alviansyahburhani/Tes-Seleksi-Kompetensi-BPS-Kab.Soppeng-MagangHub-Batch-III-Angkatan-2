import { google } from 'googleapis';

// Reuse instance Google Sheets API di memori server agar tidak membuat objek JWT baru pada setiap request
let cachedSheetsClient: ReturnType<typeof google.sheets> | null = null;
let cachedSpreadsheetId: string | null = null;

export async function getGoogleSheetsInstance() {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID!;
  if (cachedSheetsClient && cachedSpreadsheetId === spreadsheetId) {
    return { sheets: cachedSheetsClient, spreadsheetId };
  }

  const rawKey = process.env.GOOGLE_PRIVATE_KEY || '';
  const formattedKey = rawKey
    .replace(/^["']|["']$/g, '')
    .replace(/\\n/g, '\n');

  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: formattedKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  cachedSheetsClient = google.sheets({ version: 'v4', auth });
  cachedSpreadsheetId = spreadsheetId;

  return { sheets: cachedSheetsClient, spreadsheetId };
}

