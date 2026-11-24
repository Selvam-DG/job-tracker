# Job Tracker — v2.0.0 (Google Sheets)

This is a private, unpacked Chrome Manifest V3 extension. It saves each record locally **first** and syncs to an existing Google Sheet through your own Apps Script deployment. The Google Sheet is the main readable tracker; local records are a retry queue and safety copy.

## Installation
1. Extract the ZIP to a permanent folder. Open `chrome://extensions`, enable Developer mode and click **Load unpacked**. Select the folder containing `manifest.json`. If upgrading from v1, copy the new files over your previous unpacked folder and click **Reload** on that extension. Do not remove the old extension before checking whether its local data is preserved; installing a separate folder/extension may use a different extension ID and therefore different local data.
2. Create or open **your existing Google Sheet** in your Google account. Do **not** rename existing tabs called `Applications` or `Status History` that have different headers; this setup only adds/updates tabs with its expected layout. It never wipes unrelated tabs.
3. In that Sheet, select **Extensions → Apps Script**. Paste the full code from `GoogleSheetsAppsScript.gs` into `Code.gs` and save. This must be a **bound** script attached to the spreadsheet you want to update.
4. In Apps Script, go to **Project Settings → Script Properties**, add `TRACKER_SECRET` with a random, private string at least 24 characters long. Use a password generator to make it. Do not put your Google password here.
5. Select **Deploy → New deployment → Web app**. Select **Execute as: Me** and **Who has access: Anyone**. Authorize the script under your Google account, then copy the **Web app URL** ending in `/exec`. This setup allows anonymous requests but rejects requests without your private secret. Do not share either item. If your Workspace blocks public deployments, this route won't work; choose an OAuth-based alternative.
6. Open the extension icon → **Dashboard / Sheet setup**. Paste (a) your existing Google Sheet URL, (b) web app URL, (c) exactly the same secret. Click **Save connection**.
7. On a job page, click **Capture current job page**. Review fields, select Bookmarked/Not Applied/Applied/Skipped/Interview/Offer/Rejected, and save. Use the dashboard or popup dropdown to change a status. Watch the sync indicator. Click **Sync now** if needed.

## How data is arranged
- `Applications`: **one row per Job ID**, updated on later changes. Contains company, position, location, URL, source, current status, first bookmarked/applied timestamps, creation timestamp, latest status-change timestamp, latest record update timestamp, server sync timestamp, and notes. The current status column gets a dropdown list in Google Sheets.
- `Status History`: **one row per unique status-change event**, with before/after status, client event timestamp, and receipt timestamp. Repeated network retries do not duplicate events.
- The extension records **local ISO timestamps** (timezone offset determined by browser display) and writes ISO UTC strings into Sheets. The dashboard renders these in local time. Format timestamps in Sheets if you want different display styles.
- `source`: LinkedIn, Job portal, Company career site, Indeed, Other portal.

## Operational notes and limitations
- The sheet URL is for connecting and opening the document; write access is provided by the Apps Script deployment, NOT the URL alone.
- All new or edited records are written to `chrome.storage.local` before attempting sync, and a failed sync remains pending. They are retried on the next edit, when you click Sync, and periodically (about every five minutes while Chrome runs). A successful acknowledgment marks a record synced locally. Review the Pending counter; it is important to confirm actual cloud delivery.
- To protect older records, **sync never replaces the whole spreadsheet**. It finds a row by stable UUID and updates that row or appends a new row. Old statuses are retained in `Status History`.
- Do not directly edit the status dropdown in the Sheet if you want the extension and Sheet to agree: there is **no two-way sync** yet; use the dropdown in the extension or dashboard. Editing a cell directly may be overwritten by a later extension sync.
- Captures details from page metadata/JobPosting structured data when possible; does not automatically establish that an application was actually submitted, and company portals vary in extraction quality.
- Does not request Google account passwords, read job application form answers, or upload anything to any server other than your Apps Script endpoint. A public Apps Script deployment with a shared secret is a personal convenience mechanism, **not enterprise-grade OAuth authentication**. Keep the key private and rotate it if compromised. Deleting this Chrome extension can delete local records; the Sheet holds previously synchronized jobs.
- The script creates/uses only two tabs. It will refuse to overwrite tabs with different header layouts.
- If the Apps Script deployment changes, update the dashboard URL. Editing Apps Script code requires publishing a new deployment version.
