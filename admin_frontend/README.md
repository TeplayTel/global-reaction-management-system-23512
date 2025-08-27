# Admin Frontend – Emoji Management & Analytics

This React app provides an admin dashboard to manage emojis and review analytics. It implements:
- Emoji upload (multipart/form-data) to `/fan-engagement/emoji/v1/upload` with Bearer authentication.
- Emoji list rendering 100% dynamically from the backend list API. Images resolve via `http://<BASE_URL>/emoji/{emojiType}.png`.
- Analytics stats using `/fan-engagement/emoji/v1/stats`.
- Light, modern UI theme aligned to provided design notes.

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
- Get Emoji List (source of truth):
  - GET `${REACT_APP_API_BASE_URL}/fan-engagement/emoji/v1/list`
  - Each image is resolved using `${REACT_APP_API_BASE_URL}/emoji/{emojiType}.png`
  - UI reflects add/remove by refetching from this endpoint after operations
- Delete Emoji Image:
  - DELETE `${REACT_APP_API_BASE_URL}/fan-engagement/emoji/v1/{emojiIdOrType}`
- Stats:
  - GET `${REACT_APP_API_BASE_URL}/fan-engagement/emoji/v1/stats?eventId=&userId=&pageNo=&pageSize=`
  - Headers: `Authorization: Bearer <REACT_APP_ADMIN_TOKEN>`

If the backend is not available, the emoji UI will not display static/seeded emojis. Only the analytics panel uses a minimal local mock for development when `REACT_APP_API_BASE_URL` is not set.
