# Julio Jose Padilla portfolio

Lightweight Vercel-ready portfolio built with plain HTML, CSS, and JavaScript. The animated mascot is SVG/CSS, and the public chat is a small Vercel Function so the page stays fast on phones and lower-powered devices.

For a local preview, serve this folder with a static server (for example, `npx serve .` or `python -m http.server`). Opening `index.html` directly will render the page, but the shared chat cannot run from a `file://` URL.

## Shared live chat setup

The UI is ready, but global history needs a small Redis-compatible store because a browser-only store cannot share messages across visitors. On Vercel:

1. Create an Upstash Redis database (or connect Vercel KV).
2. Add `KV_REST_API_URL` and `KV_REST_API_TOKEN` in the Vercel project environment variables.
3. Redeploy. The room will then persist the latest 120 public messages.

The API limits messages to 420 characters, limits names to 32 characters, blocks common spam/link patterns, allows one message every 12 seconds per visitor, and caps each visitor at 80 messages per day. Messages are public; do not post personal or sensitive information.

Piyu is wired through a separate server-side Gemini endpoint. Keep the Gemini key in Vercel environment variables and never expose it in `script.js`.

## Contact form setup

The contact form posts to `api/contact.js` and sends through Resend. Add `RESEND_API_KEY` and a verified `CONTACT_FROM_EMAIL` in Vercel; `CONTACT_TO_EMAIL` defaults to `padillajuliojose@gmail.com`. If the API is not configured yet, the form falls back to a prefilled email draft so visitors still have a usable path.

## Piyu assistant setup

Piyu uses the free-tier Gemini API through api/piyu.js. In Vercel, add GEMINI_API_KEY using the key from Google AI Studio. You can optionally set GEMINI_MODEL; it defaults to gemini-2.0-flash. The browser never receives the key. Piyu is rate-limited when the Redis variables are also configured.
