# Admin Frontend – Emoji Management & Analytics

This React app provides an admin dashboard to manage emojis and review analytics. It implements:
- Emoji upload (multipart/form-data) to `/fan-engagement/emoji/v1/upload` with Bearer authentication.
- Emoji list rendering using both backend list API and the `http://<BASE_URL>/emoji/{emojiType}.png` image pattern.
- Analytics stats using `/fan-engagement/emoji/v1/stats`.
- Dark, modern UI theme aligned to provided design notes.

## Environment variables

Create a `.env` file (see `.env.example`) with:
- `REACT_APP_API_BASE_URL` – Base URL to the backend (e.g., `http://localhost:5050`)
- `REACT_APP_ADMIN_TOKEN` – Bearer token for protected endpoints

Do not commit real secrets.

## Available Scripts

- `npm start` – Start dev server
- `npm test` – Run tests
- `npm run build` – Production build

## API Integration Notes

- Upload Emoji:
  - POST `${REACT_APP_API_BASE_URL}/fan-engagement/emoji/v1/upload`
  - FormData fields: `emojiType`, `emojiImage` (file)
  - Headers: `Authorization: Bearer <REACT_APP_ADMIN_TOKEN>`
- Get Emoji List:
  - GET `${REACT_APP_API_BASE_URL}/fan-engagement/emoji/v1/list` (expected)
  - Each image is resolved using `${REACT_APP_API_BASE_URL}/emoji/{emojiType}.png`
- Delete Emoji Image:
  - DELETE `${REACT_APP_API_BASE_URL}/fan-engagement/emoji/v1/{emojiIdOrType}`
- Stats:
  - GET `${REACT_APP_API_BASE_URL}/fan-engagement/emoji/v1/stats?eventId=&userId=&pageNo=&pageSize=`
  - Headers: `Authorization: Bearer <REACT_APP_ADMIN_TOKEN>`

If the backend is not available, the UI falls back to an in-memory mock for development (when `REACT_APP_API_BASE_URL` is not set).
