# Housekeeping Inventory Stock Tracker

Static housekeeping and minibar operations app used for:
- Expiration control
- Minibar stock counting
- Order notifications
- Housekeeping and public area equipment tracking
- Room registry and maintenance queue
- Stock location checks
- Multi-property inventory management
- Role-based access control & security administration

## Summary of Today's Updates (2026-09-03)

1. **QR Hub Deep-Link Builder Enhancements**:
   - Updated dropdown menu styling for **QR Type** and **Target** with a dark navy background (`#0d1b2a`), gold text (`#f4e4a8`), and custom `<optgroup>` / `<option>` themes.
   - Added **Front Desk** and **Office** to the **Other Locations** section in the target selector and deep-link routing.

2. **Security & Role-Based Access Control (RBAC)**:
   - Restored and activated the PIN login security overlay.
   - Added a top navigation bar with user profile badges (👑 Admin, 💼 Manager, 👤 Staff) and a **🔒 Logout** button that clears the session and locks the app.
   - Designed 3 user tiers:
     - **Staff**: Standard inventory & stock features. **Archive**, **QR Hub**, and **Security** are hidden.
     - **Manager**: Standard inventory features + **Archive Center** & audit reports. **QR Hub** and **Security** are hidden.
     - **Admin**: Full access across all pages + **QR Hub & Code Generator** + **🔐 Security & User Management**.
   - Created a dedicated **🔐 Security & Users** administration panel to create, edit, toggle active status, and delete user accounts with individual PINs.
   - Added local cache persistence (`housekeeping_app_users_cache`) merged with Google Sheets backend synchronization to prevent user list rollbacks.

3. **Multi-Property Architecture**:
   - Implemented post-login property selection flow:
     - `PIN Login` ➔ `Property Selection Modal` ➔ `Property-Specific Inventory`.
     - Supports **Hotel V Nesplein**, **Hotel V Fizeaustraat**, and custom **Other Property** names.
   - Added an active property indicator badge with a quick **Switch** button in the header.
   - Tagged and filtered all inventory items, equipment, notifications, stock counts, and frontdesk data per property while preserving legacy data.
   - Added property assignment options when creating or editing users in Security settings.

## Canonical App File

The canonical app source is:
- `docs/index.html`

The root file:
- `index.html`

is intentionally a lightweight redirect to `docs/` to avoid maintaining two copies of the app.

## Project Structure

- `docs/index.html`: main app (HTML, CSS, JS)
- `docs/CNAME`: custom domain for GitHub Pages
- `index.html`: redirect page to `docs/`
- `Code.gs`: Google Apps Script web-app backend for Google Sheets synchronization and user accounts

## Local Run

Because this is a static app, you can run it with any static server.

Example (PowerShell, Python installed):

```powershell
cd docs
python -m http.server 5500
```

Then open:
- `http://localhost:5500`

## Deployment Notes

- GitHub Pages is expected to publish from `docs/`.
- Keep all app changes in `docs/index.html`.
- Do not duplicate feature edits in root `index.html`.

### Google Apps Script Backend

The app's configured Google Apps Script web app provides inventory synchronization and PIN account storage. Copy `Code.gs` into the Apps Script project bound to the Google Sheet.

The script creates a `Users` sheet automatically when the first account is saved. Each account requires these fields:

`id`, `user_type`, `username`, `name`, `role`, `pin`, `property`, `status`, `created_at`, `date_added`, and `is_archived`.

To publish backend changes:

1. In the Google Sheet, select **Extensions** > **Apps Script**.
2. Replace the Apps Script `Code.gs` with this repository's `Code.gs` and save.
3. Select **Deploy** > **Manage deployments**, edit the web app, select **New version**, and deploy.
4. Keep the deployed web-app URL aligned with `GOOGLE_APPS_SCRIPT_URL` in `docs/index.html`.

GitHub Pages and Google Apps Script are separate deployments. Pushing to GitHub publishes the frontend only; redeploy Apps Script after changing `Code.gs`.

## Contributor Checklist

Before opening a PR or pushing changes:

1. Make frontend feature and bugfix edits in `docs/index.html` only.
2. Leave root `index.html` as redirect-only.
3. Update `Code.gs` when the Google Sheets backend contract changes, then redeploy the Apps Script web app.
4. Run locally from `docs/` and verify the updated flow works.
5. Confirm no accidental duplication of app logic in root files.
6. Update this README if deployment or structure rules change.
