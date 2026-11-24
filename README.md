# Google Sheets Job Tracker — v3.0.0

This extension treats **Google Sheets as the primary database**, not Chrome local storage. The popup saves a job directly to your spreadsheet. The Kanban dashboard reads the spreadsheet every time you open it or click Reload. Changing a card's status updates the spreadsheet and appends to the status history.

## Install or upgrade

1. **Make a backup of your existing Google Sheet** (File → Make a copy).
2. In the TARGET Google Sheet, open Extensions → Apps Script. Replace the previous `GoogleSheetsAppsScript.gs` code with the new version in this ZIP. Save.
3. In Apps Script Project Settings → Script Properties, ensure `TRACKER_SECRET` contains a long random string (at least 24 characters). It must match the secret entered in the extension. Never share it.
4. Deploy → Manage deployments → Edit (pencil) → **New version** → Deploy. Select **Execute as Me**, **Who has access: Anyone**. Keep the `/exec` web app URL. You may need to reauthorize. If using a new deployment, paste the new URL into Settings.
5. Unzip this archive to a permanent folder. In Chrome `chrome://extensions` enable Developer Mode and choose **Load unpacked**, pointing to the folder containing `manifest.json`. For an upgrade, load v3 then disable v2 until verified. If you're replacing files in the SAME existing extension folder, click Reload in `chrome://extensions`.
6. Open the extension's Kanban dashboard → **Google Sheet connection**. Paste the Google Sheet URL, deployed Apps Script `/exec` URL, and your secret. Click **Save settings + load sheet**.
7. Open a job page, click extension → Capture → review → Save directly to Google Sheet. Refresh dashboard to see it.

## Tabs and date format

`Applications`: one row per job, unique Job ID; Company; Position; Location; URL; Source; Status; Created Date; Created Time; Last Changed Date; Last Changed Time; Language; Salary From/To/Currency; Job Description; Notes; internal ISO timestamps.

`Status History`: a separate row each time a job is CREATED or changes status, with Previous Status, New Status, Changed Date, Changed Time (HH:mm), source, URL, and event ID. Timestamps are formatted using **your Google spreadsheet time zone** (File → Settings). Created date/time are preserved when updating a job through v3.

**Important**: Editing `Applications!Status` directly in Google Sheets is reflected in the Kanban dashboard after Reload, but does **not** append history. To preserve history, change statuses using the Kanban dropdown in the extension.

## Data durability

After the server confirms each Save, the job lives in Google Sheets. Clearing Chrome extension storage does not remove previously saved Sheet records, but **does erase saved web app URL and secret**, which you must re-enter to reconnect. Offline saves are **not queued** in v3; a failed save remains unsaved. Keep the popup open until you see confirmation. Do not delete the old v2 extension until you have imported and verified any local pending jobs.

## Import records from v2

If installing v3 **over the same extension ID** with existing `job:*` records in Chrome local storage, use Dashboard → Google Sheet connection → **Import old locally saved jobs**. It retains the old Chrome records. If you install as a different extension, Chrome isolates their storage, so this import cannot read v2's data. Do not uninstall the older extension before migrating. Older dates from v2 are not recreated by this importer; imported items receive a fresh created date/time and initial status history entry. Preserve your old Sheet or exports for historical dates.

**Legacy sheet compatibility**: v3 adds new header columns to an existing `Applications` tab rather than deleting rows. Older rows with existing Job IDs can be loaded. Existing Created At ISO fields may remain populated but Created Date/Time for old records may be blank until you edit them. Keep a backup before deploying.

## Caveats

- Automated capture uses JobPosting JSON-LD metadata and page content, so some job descriptions, salaries, languages, and locations need manual review; it is NOT automatic application confirmation.
- Apps Script web app access is `Anyone` with a shared secret in the POST body; treat the secret and deployment URL as sensitive. This is appropriate for a personal prototype, but a production system should use stronger Google OAuth authorization.
- Job descriptions are truncated for spreadsheet cell limits.
- Web app requests require network availability. Google Apps Script quotas apply.
