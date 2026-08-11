Housekeeping App — Clean Slate

This folder is a minimal starting point for the Housekeeping Inventory UI.

How to use

1. If you already have the fixed HTML (`minibar-fixed.html`) at the workspace root, copy it here and rename to `index.html`:

   ```powershell
   copy ..\minibar-fixed.html .\index.html
   ```

2. Serve the folder locally:

   ```powershell
   python -m http.server 8000
   ```

3. Open the app in your browser:

   http://localhost:8000/

Notes

- I've included basic safeguards in the fixed HTML (sanitization, safe SDK wrapper, removed unexpected iframe/script). If you want me to embed the full fixed HTML into `index.html` here, tell me and I'll paste it into this file.
- If you want a full project scaffold (npm, build tools, React/Vue conversion), say which framework and I'll scaffold it.