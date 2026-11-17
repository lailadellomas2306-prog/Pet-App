# The Dog Dept.

A dog-breed field guide with a responsive editorial interface and a small Node.js back-end. The browser requests breed data from `/api/breeds`; dog photos are loaded on demand through `/api/images/:breedId`.

## Run locally

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env`.
3. If you already have access to Google's Custom Search JSON API, add its API key and Programmable Search Engine ID to `.env`, then enable image search in the engine.
4. Run `npm start` and open <http://localhost:3000>.

The Google API key stays on the server. Restrict it to the Custom Search API in Google Cloud, and keep `.env` private. Google image search uses the Programmable Search Engine image-search configuration and is subject to Google's availability, terms, and quota. As of November 2026, Google has closed the Custom Search JSON API to new customers and plans to discontinue it on January 1, 2027. See [Google's API overview](https://developers.google.com/custom-search/v1/overview) for current availability.

Without an existing Google API account and credentials, the breed guide still works; image cards explain why photos are unavailable.
