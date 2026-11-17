const grid = document.querySelector("#breed-grid");
const statusMessage = document.querySelector("#status-message");
const emptyMessage = document.querySelector("#empty-message");
const searchInput = document.querySelector("#breed-search");
const filterButtons = [...document.querySelectorAll(".filter-chip")];
let breeds = [];
let activeFilter = "All";
let imageObserver;
let imageSearchConfigured = false;

const imageMemo = new Map();

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function cardMarkup(breed, index) {
  const palettes = ["peach", "sage", "lavender", "butter", "blue", "rose"];
  const photoMessage = imageSearchConfigured
    ? "PHOTO COMING RIGHT UP"
    : "GOOGLE IMAGE SEARCH REQUIRES AN EXISTING API ACCOUNT";
  return `
    <article class="breed-card" style="--card-delay:${index * 45}ms">
      <div class="card-photo ${palettes[index % palettes.length]}" data-breed="${escapeHtml(breed.id)}">
        <span class="photo-badge">${escapeHtml(breed.group)}</span>
        <div class="photo-placeholder"><span aria-hidden="true">🐾</span><small>${photoMessage}</small></div>
        <img class="breed-image" alt="${escapeHtml(breed.name)} dog" loading="lazy" hidden>
        <a class="photo-source" target="_blank" rel="noreferrer" hidden>Image source ↗</a>
        <span class="photo-error" hidden>Photo unavailable</span>
      </div>
      <div class="card-content">
        <div class="card-kicker"><span>BREED NO. ${String(index + 1).padStart(2, "0")}</span><strong>${escapeHtml(breed.group.toUpperCase())}</strong></div>
        <h3>${escapeHtml(breed.name)}</h3>
        <p class="card-description">${escapeHtml(breed.description)}</p>
        <div class="card-meta"><span>${escapeHtml(breed.size.toUpperCase())} SIZE</span><span class="meta-dot">✳</span><span>${escapeHtml(breed.temperament.toUpperCase())}</span></div>
      </div>
    </article>`;
}

function observePhotos() {
  imageObserver?.disconnect();
  imageObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const photo = entry.target;
      imageObserver.unobserve(photo);
      loadImage(photo);
    }
  }, { rootMargin: "160px" });
  grid.querySelectorAll(".card-photo").forEach((photo) => imageObserver.observe(photo));
}

async function loadImage(photo) {
  const id = photo.dataset.breed;
  const image = photo.querySelector(".breed-image");
  const source = photo.querySelector(".photo-source");
  const placeholder = photo.querySelector(".photo-placeholder");
  const failure = photo.querySelector(".photo-error");

  try {
    let data = imageMemo.get(id);
    if (!data) {
      const response = await fetch(`/api/images/${encodeURIComponent(id)}`);
      data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load a photo.");
      imageMemo.set(id, data);
    }
    image.addEventListener("load", () => {
      placeholder.hidden = true;
      image.hidden = false;
    }, { once: true });
    image.addEventListener("error", () => {
      placeholder.hidden = true;
      failure.hidden = false;
    }, { once: true });
    source.href = data.sourceUrl;
    source.hidden = false;
    image.src = data.url;
  } catch (error) {
    placeholder.hidden = true;
    failure.textContent = error.message.includes("not configured")
      ? "Add Google image search details to .env"
      : "Photo unavailable";
    failure.hidden = false;
  }
}

function renderBreeds() {
  const search = searchInput.value.trim().toLowerCase();
  const visibleBreeds = breeds.filter((breed) => {
    const matchesFilter = activeFilter === "All"
      || (activeFilter === "Small" ? breed.size === "Small" : breed.group === activeFilter);
    const matchesSearch = `${breed.name} ${breed.group} ${breed.temperament}`.toLowerCase().includes(search);
    return matchesFilter && matchesSearch;
  });

  grid.innerHTML = visibleBreeds.map(cardMarkup).join("");
  emptyMessage.hidden = visibleBreeds.length > 0;
  statusMessage.hidden = true;
  document.querySelector("#result-count").innerHTML =
    `<strong>${visibleBreeds.length}</strong> ${visibleBreeds.length === 1 ? "BREED" : "BREEDS"} IN THE INDEX`;
  if (imageSearchConfigured) observePhotos();
  else imageObserver?.disconnect();
}

async function loadBreeds() {
  try {
    const response = await fetch("/api/breeds");
    const data = await response.json();
    if (!response.ok || !Array.isArray(data.breeds)) {
      throw new Error(data.error || "Could not load breeds from the server.");
    }
    breeds = data.breeds;
    imageSearchConfigured = data.imageSearchConfigured === true;
    document.querySelector("#breed-count").textContent =
      `${breeds.length} BREEDS. INFINITE PERSONALITY.`;
    filterButtons.forEach((button) => {
      const filter = button.dataset.filter;
      const count = filter === "All"
        ? breeds.length
        : breeds.filter((breed) => filter === "Small"
          ? breed.size === "Small"
          : breed.group === filter).length;
      button.querySelector("span").textContent = String(count).padStart(2, "0");
    });
    renderBreeds();
  } catch (error) {
    statusMessage.textContent = `We couldn't load the breeds. ${error.message}`;
    statusMessage.classList.add("error");
  }
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    filterButtons.forEach((item) => {
      const selected = item === button;
      item.classList.toggle("selected", selected);
      item.setAttribute("aria-pressed", String(selected));
    });
    renderBreeds();
  });
});

searchInput.addEventListener("input", renderBreeds);
document.addEventListener("keydown", (event) => {
  if (event.key === "/" && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
    event.preventDefault();
    searchInput.focus();
  }
  if (event.key === "Escape" && document.activeElement === searchInput) {
    searchInput.value = "";
    searchInput.blur();
    renderBreeds();
  }
});

loadBreeds();
