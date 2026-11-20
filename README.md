# Mahalaxmi Enterprise ERP

Responsive ERP interface with Vercel serverless authentication and a Google Drive Excel workbook as the account source of truth. No SQL, Firebase, or Supabase database is used.

## Local development

```powershell
npm.cmd install
npm.cmd run dev
npm.cmd run build
```

Local `/api/*` requests run through the Vite middleware and use the same handlers as Vercel. To use them locally, create an untracked `.env.local` with the server variables below. Files matching `*.local` are ignored by Git.

## Google Drive and Vercel setup

1. Put `Mahalaxmi-Enterprise-Master.xlsx` in Google Drive. The OAuth account configured below must be able to edit that file.
2. In Google Cloud Console, enable the Google Drive API, create an OAuth 2.0 client, and obtain a refresh token authorized for `https://www.googleapis.com/auth/drive`.
3. In Vercel, open **Project → Settings → Environment Variables** and add:
   - `GOOGLE_DRIVE_CLIENT_ID`
   - `GOOGLE_DRIVE_CLIENT_SECRET`
   - `GOOGLE_DRIVE_REFRESH_TOKEN`
   - `GOOGLE_DRIVE_WORKBOOK_ID` — the Drive file ID from the workbook URL
   - `SESSION_SECRET` — generate a private 48-byte secret with `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"`
4. Redeploy after setting the variables.

Never paste OAuth credentials or `SESSION_SECRET` into chat or frontend code. If the Google OAuth consent app remains in Testing mode, Google may expire refresh tokens; configure the consent app appropriately for ongoing use.

## Accounts and roles

- The first Admin is created once through the setup link after Google Drive is configured.
- The `Users` worksheet is added to the master workbook when the first Admin is created.
- Passwords are stored as salted PBKDF2 hashes; raw passwords are never written to the workbook.
- The Admin creates non-admin accounts from **Create team login** or **More → User Management**.
- `/admin` is for the single Super Admin; team members use the main login page. API handlers verify roles and use an HttpOnly session cookie.
- User creation and status changes create a Drive backup before updating the workbook.

## Current scope and cautions

The original workbook is read from Google Drive only after the server variables are configured. The local `public/Mahalaxmi-Enterprise-Master.xlsx` is a read-only preview copy and is not the deployed source of truth.

The browser Excel import/export and several ERP screens are still frontend-only; do not treat them as synchronized workbook writes. The current SheetJS `xlsx` dependency has a high-severity audit advisory with no available fix. Use only a trusted master workbook until the parser is replaced.
