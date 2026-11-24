# Local Job Tracker — v1.0.0

A personal Chrome Manifest V3 extension. No backend, Google login, or server required.

## Install
1. Unzip the archive into a permanent folder on your laptop.
2. Open `chrome://extensions` in Google Chrome.
3. Enable Developer mode and choose **Load unpacked**.
4. Select the extracted folder containing `manifest.json`.
5. Pin **Local Job Tracker** to your toolbar.

## Use
1. Open a job listing in Chrome.
2. Select the extension icon and **Capture current job page**.
3. Verify the prefilled fields, choose the status, and click **Save application**.
4. Export JSON frequently for a full backup, or CSV for a spreadsheet.
5. To restore a backup, use **Import JSON backup or CSV export**. This merges records.

## Important limitations
- Captures on demand; does not automatically detect successful application submission.
- Extraction relies on public page metadata and JobPosting JSON-LD. Some pages require manual fixes.
- Stores locally in Chrome extension storage, not Google Sheets or Chrome Sync.
- Deleting the extension or clearing its site/extension data may delete records. Save backups elsewhere.
- Imports supported: JSON exported by this extension; CSV with matching column headers.
- No collection or upload of passwords, cookies, or application form fields.
