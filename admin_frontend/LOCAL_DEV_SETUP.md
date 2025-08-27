# Admin Frontend – Local Dev Setup and Upload API Troubleshooting

PUBLIC_INTERFACE
This document explains how to run the Admin Frontend locally and verify the Emoji upload API (POST /fan-engagement/emoji/v1/upload) works reliably with the backend.

1) Prerequisites
- Node.js 16+ (recommended LTS)
- Backend service running locally (provide your team’s admin_backend service)
- Ensure CORS allows requests from http://localhost:3000

2) Environment Variables
Create a .env file in admin_frontend with:
REACT_APP_API_BASE_URL=http://localhost:5050
REACT_APP_ADMIN_TOKEN=REPLACE_WITH_LOCAL_DEV_TOKEN

Never commit real secrets. See admin_frontend/README.md for details.

3) Install & Run
cd global-reaction-management-system-23512/admin_frontend
npm install
npm start

The app will run at http://localhost:3000.

4) Verifying GET list
The Emoji grid loads from:
GET {REACT_APP_API_BASE_URL}/fan-engagement/emoji/v1/list
Each image renders from:
{REACT_APP_API_BASE_URL}/emoji/{emojiType}.png

5) Verifying POST upload
UI flow:
- Click “Add Emoji”
- Enter a name (e.g., fire)
- Choose a PNG/SVG image
- Click Save

Request details (from src/services/api.js):
- Method: POST
- URL: {BASE_URL}/fan-engagement/emoji/v1/upload
- Headers:
  - Authorization: Bearer {REACT_APP_ADMIN_TOKEN} (if provided)
  - Accept: application/json
  - Content-Type: not set manually (browser sets multipart boundary)
- Body (multipart/form-data):
  - emojiType: <string> (e.g., fire)
  - emojiImage: <file> (with filename)

Response handling:
- JSON preferred; otherwise status-only ack is accepted.
- The UI immediately refetches the list and closes the modal on success.
- Errors are displayed inline in the modal.

6) Common issues and fixes
- Request pending/stuck in DevTools:
  - Ensure backend is running and reachable at REACT_APP_API_BASE_URL.
  - Confirm no proxy or VPN blocks localhost ports.
  - The frontend uses a 25s timeout; an AbortError will appear if the request exceeds this.
- 401/403 Unauthorized:
  - Set REACT_APP_ADMIN_TOKEN and verify the backend expects Bearer token.
- 415 Unsupported Media Type:
  - Do not set Content-Type header manually. The frontend leaves it to the browser.
- 400/422 Validation error:
  - Check field names match: emojiType and emojiImage.
- CORS preflight failed:
  - Backend must allow:
    - Access-Control-Allow-Origin: http://localhost:3000
    - Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS
    - Access-Control-Allow-Headers: Authorization, Content-Type

7) After upload
- The grid refreshes from the GET list endpoint. If the image still 404s, ensure the backend persists the file and serves it at /emoji/{emojiType}.png.

8) Testing delete
- Click “Delete” on a card to call:
  DELETE {BASE_URL}/fan-engagement/emoji/v1/{emojiIdOrType}
- The grid reloads afterward.

9) Notes for backend implementers
- Accept multipart form with fields: emojiType (text) and emojiImage (file).
- Respond with JSON for best UX:
  { "emojiId": "...", "emojiType": "fire" }
- Ensure ETag/Cache headers for /emoji/*.png if needed.

10) Support
If issues persist, capture the Network tab export and backend logs to share with the team.
