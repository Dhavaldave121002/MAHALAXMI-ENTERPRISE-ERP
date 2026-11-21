# Mahalaxmi Enterprise ERP

Responsive ERP interface with Vercel serverless authentication and a Google Sheet as the shared source of truth for accounts, catalog, machines, production, and inventory. Google Apps Script securely bridges Vercel to the sheet. No SQL, Firebase, or Supabase database is used.

## Local development

```powershell
npm.cmd install
npm.cmd run dev
npm.cmd run build
```

Local `/api/*` requests run through the Vite middleware and use the same handlers as Vercel. To use them locally, create an untracked `.env.local` with the server variables below. Files matching `*.local` are ignored by Git.

## Google Sheets Apps Script and Vercel setup

1. Upload the master `.xlsx` file to Google Drive. In Google Sheets, open it and choose **File → Save as Google Sheets**. Keep the original `.xlsx` as a backup; the converted Sheet is the live master.
2. From the converted Sheet, choose **Extensions → Apps Script**. Replace `Code.gs` with [`apps-script/Code.gs`](./apps-script/Code.gs) and save.
3. Generate an Apps Script API secret locally with `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"`. In the Sheet, choose **Mahalaxmi ERP → Configure API access**, enter this secret, and approve the requested Sheets/Drive permissions. The script stores the Sheet ID and secret in Script Properties.
4. In Apps Script, choose **Deploy → New deployment → Web app**. Set **Execute as** to yourself and **Who has access** to **Anyone**, then deploy and copy the web app URL ending in `/exec`.
5. In Vercel, open **Project → Settings → Environment Variables** and add:
   - `GOOGLE_APPS_SCRIPT_URL` — the deployed `/exec` URL
   - `GOOGLE_APPS_SCRIPT_SECRET` — the same secret entered in the Sheet menu
   - `SESSION_SECRET` — generate a different private 48-byte secret with the command above
6. Redeploy after setting the variables. If Apps Script code changes later, update the existing deployment to a new version.

Never paste either secret into chat, frontend code, or GitHub. The web app endpoint is public but requires the server-only shared secret; do not put that secret in browser code.

## Accounts and roles

- The first Admin is created once through the setup link after the Apps Script connection is configured.
- The `Users` worksheet is added to the Google Sheet when the first Admin is created.
- Passwords are stored as salted PBKDF2 hashes; raw passwords are never written to the workbook.
- The Admin creates non-admin accounts from **Create team login** or **More → User Management**.
- `/admin` is for the single Super Admin; team members use the main login page. API handlers verify roles and use an HttpOnly session cookie.
- After sign-in, Super Admin alone can open the admin workspaces: catalog, machines, inventory, stock movements, shipping/returns, User Management, and the Management section (Employees, Suppliers, Accounts, Reports). Production Supervisors can enter production and use assigned factory workspaces; Operators can enter production. Store Manager accounts do not receive access to inventory or management workspaces.
- User creation and status changes create a Drive backup before updating the Google Sheet.

## Shared catalog, production, and inventory workflow

- The Super Admin creates master products in **Product Master**, SKU variants in **SKU Manager**, and machines in **Machines**. These save to the corresponding Google Sheet tabs. Only the Super Admin can manage user accounts.
- Active SKUs are read from the Google Sheet for team accounts. When a product has active variants, production shows those variants instead of an ambiguous parent SKU; the selector displays product name, SKU, size, and color.
- Machine entries save to the `Machines` sheet. Supervisors and operators can select configured, non-maintenance machines; only the Super Admin can manage the machine list.
- Production entries are validated and saved to the `Production` sheet. Approved production automatically increases the matching SKU's finished-goods balance and adds a stock movement; rejected quantities are recorded separately. The API adds a `Variant SKU` column if needed so variant selections remain identifiable.
- Admin-only **Raw Material** creates raw-material records and supports purchase inward, issue, machine/stitching consumption, wastage, and stock adjustments. Admin-only **Finished Goods** supports opening stock, dispatch, returns, damage, reservations, and adjustments.
- Admin-only **Inventory** summarizes raw-material and available finished-goods balances. **Shipping & Delivery** posts dispatches; **Returns & RTO** posts returns or damage. These operations update the live Sheet through a script lock and create a Drive backup before changing balances. The API withholds stock balances and the inventory ledger from non-admin roles.
- **Stock Movement** is the append-only audit ledger. Posted movements cannot be deleted; correct them with an adjustment. A zero-balance item with history can only be archived. A zero-balance item without history may be deleted.
- The workbook tabs `Raw_Materials`, `Finished_Goods`, and `Stock_Movement` are required for live inventory operations. The Apps Script adds the inventory adjustment/status and ledger item-type columns when needed.
- The app reloads shared workbook data on sign-in and when a signed-in browser returns to the foreground.
- Writes create a Drive backup and Apps Script locks edits to avoid concurrent row writes. The Apps Script source in `apps-script/Code.gs` must be deployed as a new version after changes.

## Current scope and cautions

The converted Google Sheet is the live master. Changes made by the app do not update the original `.xlsx` backup; download/export the Google Sheet as Excel when an `.xlsx` copy is needed. The local `public/Mahalaxmi-Enterprise-Master.xlsx` is a read-only preview copy and is not the deployed source of truth.

Excel file uploads are validation previews only and do not write to the live Sheet. Some non-inventory ERP screens are still frontend-only; do not treat those as synchronized writes. The current SheetJS `xlsx` dependency has a high-severity audit advisory with no available fix. Use only trusted files until the parser is replaced.
