# The Dog Dept.

A dog-breed field guide with a responsive editorial interface and a small Node.js back-end. The browser requests breed data from `/api/breeds`; breed-specific dog photos are loaded on demand through `/api/images/:breedId`. The back-end gets photos from the free [Dog CEO Dog API](https://dog.ceo/dog-api/) and caches each result for an hour.

## Run locally

1. Install Node.js 20 or newer.
2. Run `npm start` and open <http://localhost:3000>.

Photo requests are made on demand, so the breed list appears immediately while each image loads. An internet connection is required to fetch new photos; the browser reuses each image URL once it has loaded.
