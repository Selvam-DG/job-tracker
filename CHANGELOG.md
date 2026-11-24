# Changelog

All notable changes are organized by release. Each release describes the source code associated with its Git tag, not later planned features.

## [3.1.0]

### Added / Changed
- Add JobBoard logo and Chrome toolbar icons.
- Add recent jobs (5 or 10), status and text filters, and collapsible section to popup.
- Add dashboard text, status and Created/Changed date-range filters.
- Show 10 recent cards per Kanban column initially, with Show 10 more controls.
- Add GitHub-ready documentation and `.gitignore`.

## [3.0.0]

### Added / Changed
- Make Google Sheets the primary source of truth and read jobs back into the extension.
- Add Kanban dashboard with status changes sent directly to Sheets.
- Store Created Date/Time and Last Changed Date/Time (24-hour HH:mm).
- Add application language, salary range/currency and job description.
- Record initial status and later status transitions in `Status History`.
- Offer import of existing local v2 records when installed under the same extension ID.

## [2.0.0]

### Added / Changed
- Add Google Sheets integration through a spreadsheet-bound Google Apps Script web app.
- Introduce an `Applications` tab and append-only `Status History` tab.
- Keep local-first records with a pending sync queue and retries.
- Add source categories, status dropdowns and first-bookmarked/applied timestamps.

## [1.0.0]

### Initial release
- Initial Chrome Manifest V3 extension for personal job tracking.
- Capture job details from page metadata and review before saving.
- Save records in Chrome extension local storage.
- Track job statuses and import/export CSV or JSON backups.
