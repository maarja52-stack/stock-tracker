# Housekeeping Inventory Stock Tracker

Static housekeeping and minibar operations app used for:
- Expiration control
- Minibar stock counting
- Order notifications
- Housekeeping and public area equipment tracking
- Room registry and maintenance queue
- Stock location checks

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

## Contributor Checklist

Before opening a PR or pushing changes:

1. Make feature and bugfix edits in `docs/index.html` only.
2. Leave root `index.html` as redirect-only.
3. Run locally from `docs/` and verify the updated flow works.
4. Confirm no accidental duplication of app logic in root files.
5. Update this README if deployment or structure rules change.
