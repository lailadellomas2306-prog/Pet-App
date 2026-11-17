const http = require("node:http");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { URL } = require("node:url");

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");

const breeds = [
  { id: "golden-retriever", name: "Golden Retriever", group: "Family", size: "Large", temperament: "Friendly, devoted, playful", description: "A sunny-hearted companion who loves being part of the family.", imageBreed: "retriever/golden" },
  { id: "labrador-retriever", name: "Labrador Retriever", group: "Family", size: "Large", temperament: "Outgoing, even-tempered, gentle", description: "An easygoing best friend with a big heart and boundless enthusiasm.", imageBreed: "labrador" },
  { id: "french-bulldog", name: "French Bulldog", group: "Small", size: "Small", temperament: "Adaptable, playful, affectionate", description: "A compact charmer happiest wherever their favorite people are.", imageBreed: "bulldog/french" },
  { id: "german-shepherd", name: "German Shepherd", group: "Active", size: "Large", temperament: "Confident, courageous, smart", description: "A clever, loyal partner who thrives with a job to do.", imageBreed: "german/shepherd" },
  { id: "beagle", name: "Beagle", group: "Small", size: "Small", temperament: "Merry, curious, friendly", description: "A cheerful explorer who follows every interesting scent.", imageBreed: "beagle" },
  { id: "poodle", name: "Poodle", group: "Fluffy", size: "Medium", temperament: "Active, proud, intelligent", description: "A bright, athletic dog with a famously curly coat.", imageBreed: "poodle/standard" },
  { id: "shiba-inu", name: "Shiba Inu", group: "Small", size: "Small", temperament: "Alert, spirited, good-natured", description: "A confident little adventurer with a big personality.", imageBreed: "shiba" },
  { id: "pembroke-welsh-corgi", name: "Pembroke Welsh Corgi", group: "Small", size: "Small", temperament: "Affectionate, smart, alert", description: "A quick-witted companion with short legs and a sunny outlook.", imageBreed: "pembroke" },
  { id: "dachshund", name: "Dachshund", group: "Small", size: "Small", temperament: "Curious, lively, devoted", description: "A brave little character ready to investigate every corner.", imageBreed: "dachshund" },
  { id: "border-collie", name: "Border Collie", group: "Active", size: "Medium", temperament: "Energetic, bright, responsive", description: "A remarkable thinker who loves learning and moving.", imageBreed: "collie/border" },
  { id: "pomeranian", name: "Pomeranian", group: "Fluffy", size: "Small", temperament: "Inquisitive, bold, lively", description: "A tiny, fluffy extrovert who brings a lot of sparkle.", imageBreed: "pomeranian" },
  { id: "samoyed", name: "Samoyed", group: "Fluffy", size: "Large", temperament: "Friendly, gentle, adaptable", description: "A smiling snow-dog with a soft coat and an even softer heart.", imageBreed: "samoyed" }
];

const PORT = Number(process.env.PORT) || 3000;

const imageCache = new Map();
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml"
};

function sendJson(response, status, data) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(data));
}

async function findBreedImage(breed) {
  const cached = imageCache.get(breed.id);
  if (cached && cached.expiresAt > Date.now()) return cached.image;

  const imagePath = breed.imageBreed.split("/").map(encodeURIComponent).join("/");
  const result = await fetch(`https://dog.ceo/api/breed/${imagePath}/images/random`, {
    signal: AbortSignal.timeout(10000)
  });
  if (!result.ok) {
    const error = new Error(`The dog photo service returned HTTP ${result.status}.`);
    error.status = 502;
    throw error;
  }

  const data = await result.json();
  if (data.status !== "success" || typeof data.message !== "string") {
    const error = new Error(`A photo isn't available for ${breed.name} right now.`);
    error.status = 502;
    throw error;
  }

  const image = {
    url: `/api/images/${encodeURIComponent(breed.id)}/photo`,
    sourceUrl: data.message,
    title: `${breed.name} dog`
  };
  imageCache.set(breed.id, { image, expiresAt: Date.now() + 60 * 60 * 1000 });
  return image;
}

async function handleRequest(request, response) {
  if (request.method !== "GET") {
    response.writeHead(405, { Allow: "GET" });
    response.end("Method not allowed");
    return;
  }

  const requestUrl = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  if (requestUrl.pathname === "/api/breeds") {
    sendJson(response, 200, { breeds, imagesAvailable: true });
    return;
  }

  const photoMatch = requestUrl.pathname.match(/^\/api\/images\/([a-z0-9-]+)\/photo$/);
  if (photoMatch) {
    const breed = breeds.find((item) => item.id === photoMatch[1]);
    if (!breed) {
      sendJson(response, 404, { error: "Breed not found." });
      return;
    }

    try {
      const image = await findBreedImage(breed);
      const result = await fetch(image.sourceUrl, { signal: AbortSignal.timeout(10000) });
      if (!result.ok) {
        console.error(`Photo download failed for ${breed.name}: HTTP ${result.status}`);
        sendJson(response, 502, { error: "The dog photo service could not provide this image." });
        return;
      }

      const contentType = result.headers.get("content-type") || "";
      if (!contentType.startsWith("image/")) {
        console.error(`Photo download failed for ${breed.name}: unexpected content type ${contentType}`);
        sendJson(response, 502, { error: "The dog photo service returned an invalid image." });
        return;
      }

      response.writeHead(200, {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
        "X-Content-Type-Options": "nosniff"
      });
      response.end(Buffer.from(await result.arrayBuffer()));
    } catch (error) {
      console.error(`Photo download failed for ${breed.name}: ${error.message}`);
      if (!response.headersSent) sendJson(response, 502, { error: "The dog photo service is temporarily unavailable." });
    }
    return;
  }

  const imageMatch = requestUrl.pathname.match(/^\/api\/images\/([a-z0-9-]+)$/);
  if (imageMatch) {
    const breed = breeds.find((item) => item.id === imageMatch[1]);
    if (!breed) {
      sendJson(response, 404, { error: "Breed not found." });
      return;
    }

    try {
      sendJson(response, 200, await findBreedImage(breed));
    } catch (error) {
      const status = error.status || 502;
      console.error(`Image search failed for ${breed.name}: ${error.message}`);
      sendJson(response, status, { error: error.message });
    }
    return;
  }

  const pathname = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
  const filePath = path.resolve(PUBLIC_DIR, `.${pathname}`);
  const relativePath = path.relative(PUBLIC_DIR, filePath);
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const body = readFileSync(filePath);
    response.writeHead(200, {
      "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream",
      "X-Content-Type-Options": "nosniff"
    });
    response.end(body);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}

http.createServer((request, response) => {
  handleRequest(request, response).catch((error) => {
    console.error("Request failed:", error);
    if (!response.headersSent) sendJson(response, 500, { error: "The server could not complete the request." });
  });
}).listen(PORT, () => {
  console.log(`Good Dogs is running at http://localhost:${PORT}`);
});
