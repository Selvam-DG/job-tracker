# JobBoard v3.2.0 — Contact Management (feature branch)

This **feature-branch release** builds on v3.1.0. All existing job tracking, filters, and Kanban views remain.

## What's new

- Separate **Contacts** tab in your existing Google Sheet, linked using immutable **Job ID**. One job can have multiple contacts.
- Contact fields: name, type (Recruiter / HR / Hiring Manager / Other), role, department, work email, phone, LinkedIn URL, source, language, and notes.
- Created date/time and updated date/time for each contact (spreadsheet timezone, 24-hour HH:mm). Original creation timestamp preserved on edits.
- Kanban: **View details** → Contacts → add/edit/delete contacts.
- Popup: optional recruiter contact fields next to job capture; tries to extract only visible `mailto:` contact and visible LinkedIn profile. **Review before saving.**
- Saving a job can also save an optional contact. If a contact fails to save, the popup reports the partial failure; never assumes both succeeded.

## Install / upgrade from v3.1.0

1. **Back up your Google Sheet**, including Applications and Status History.
2. Open your existing bound Apps Script via **Extensions → Apps Script**. Replace the existing `GoogleSheetsAppsScript.gs` code with this version (preserve `TRACKER_SECRET` under Script Properties).
3. **Deploy → Manage deployments → Edit → New version → Deploy**. Reuse the `/exec` URL for that deployment. Keep Execute as Me and access settings configured for your use. Do not share your secret.
4. Extract this folder. For local testing use **chrome://extensions → Developer mode → Load unpacked** (or reload an existing unpacked installation using the same folder). Configure Google Sheet settings in Dashboard if necessary.
5. Open a job card → View details → Add a contact; inspect the new **Contacts** sheet.

### Data model

`Applications` continues to own job records. `Contacts` stores one row per person with `Contact ID` and `Job ID`. The backend verifies that the parent job exists before writing a contact. **Status History** remains unchanged.

Only job records are displayed in the Kanban board; contacts are shown when a job is selected. Contact data is read directly from Sheets on selection. Clearing Chrome extension storage does not delete contact rows already saved in Sheets. It does delete local connection settings.

### Privacy & security

Only collect relevant professional details that you are authorized to use. The popup does not use hidden LinkedIn data and never sends contact data to any service other than your configured Apps Script endpoint. The existing shared-secret Apps Script design is intended for personal/controlled testing; **do not publish it as a multi-user Chrome Web Store release without redesigning authorization (for example, individual Google OAuth access).**

### Limitations

- Contact detection is best-effort and typically only finds visible mailto/LinkedIn links; most websites need manual entry.
- Editing contacts directly in Sheets bypasses validation and contact timestamp logic.
- Saving the job and optional contact uses two requests, not one atomic transaction. If the contact write fails, retry from the Kanban contacts editor after inspecting the sheet.
- Deleting a contact removes its row permanently; back up the sheet first.
- Live browser / Google account end-to-end testing remains necessary.


