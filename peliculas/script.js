const movieNameRef = document.getElementById("movie-name");
const searchBtn = document.getElementById("search-btn");
const result = document.getElementById("result");
const modal = document.getElementById("movie-modal");
const modalDetails = document.getElementById("modal-details");
const pagination = document.getElementById("pagination");
const filterSelect = document.getElementById("media-filter");
const statusBox = document.getElementById("status");
const themeBtn = document.getElementById("theme-btn");

let currentPage = 1;
let currentQuery = "";

/* =========================
   STATUS HELPERS (UI)
========================= */
function setStatus(type, message) {
  // type: "loading" | "info" | "error" | "success"
  if (!statusBox) return;

  let html = "";
  if (type === "loading") {
    html = `
      <div class="alert alert-warning d-flex align-items-center gap-2" role="status">
        <span class="spinner-border" aria-hidden="true"></span>
        <span>${message || "Cargando..."}</span>
      </div>
    `;
  } else if (type === "error") {
    html = `
      <div class="alert alert-danger" role="alert">
        <i class="bi bi-exclamation-triangle me-2"></i>${message || "Ocurrió un error."}
      </div>
    `;
  } else if (type === "info") {
    html = `
      <div class="alert alert-info" role="alert">
        <i class="bi bi-info-circle me-2"></i>${message || ""}
      </div>
    `;
  } else if (type === "success") {
    html = `
      <div class="alert alert-success" role="alert">
        <i class="bi bi-check-circle me-2"></i>${message || ""}
      </div>
    `;
  }

  statusBox.innerHTML = html;
}

function clearStatus() {
  if (statusBox) statusBox.innerHTML = "";
}

/* =========================
   THEME TOGGLE (Dark/Light)
========================= */
function applyTheme(theme) {
  // theme: "dark" | "light"
  if (theme === "dark") document.body.classList.add("dark-mode");
  else document.body.classList.remove("dark-mode");

  // icon toggle
  if (themeBtn) {
    themeBtn.innerHTML = theme === "dark"
      ? '<i class="bi bi-sun"></i>'
      : '<i class="bi bi-moon-stars"></i>';
  }
}

function initTheme() {
  // 1) localStorage
  const saved = localStorage.getItem("theme");
  if (saved === "dark" || saved === "light") {
    applyTheme(saved);
    return;
  }

  // 2) prefer system
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(prefersDark ? "dark" : "light");
}

if (themeBtn) {
  themeBtn.addEventListener("click", function () {
    const isDark = document.body.classList.contains("dark-mode");
    const next = isDark ? "light" : "dark";
    localStorage.setItem("theme", next);
    applyTheme(next);
  });
}

initTheme();

/* =========================
   SEARCH
========================= */
const buscarPeliculas = (page = 1) => {
  const query = movieNameRef.value.trim();

  if (query.length <= 0) {
    result.innerHTML = "";
    pagination.innerHTML = "";
    setStatus("info", "Por favor escribe el nombre de una película o serie.");
    return;
  }

  clearStatus();
  currentQuery = query;
  currentPage = page;

  const searchURL = `https://api.themoviedb.org/3/search/multi?api_key=${tmdbKey}&language=es-ES&query=${encodeURIComponent(query)}&page=${page}`;

  result.innerHTML = "";
  pagination.innerHTML = "";
  setStatus("loading", "Buscando contenido...");

  fetch(searchURL)
    .then(res => res.json())
    .then(data => {
      const rawResults = (data && data.results) ? data.results : [];
      if (rawResults.length === 0) {
        setStatus("info", "No se encontraron resultados. Intenta con otro término.");
        return;
      }

      const filtro = filterSelect.value;
      const filtrados = rawResults.filter(item => {
        if (filtro === "all") return item.media_type === "movie" || item.media_type === "tv";
        return item.media_type === filtro;
      });

      if (filtrados.length === 0) {
        setStatus("info", "No hay resultados con el filtro seleccionado.");
        return;
      }

      clearStatus();
      mostrarResultados(filtrados);
      generarPaginacion(data.page, data.total_pages);
    })
    .catch(() => {
      result.innerHTML = "";
      pagination.innerHTML = "";
      setStatus("error", "No se pudo completar la búsqueda. Verifica tu conexión e inténtalo nuevamente.");
    });
};

const mostrarResultados = (items) => {
  result.innerHTML = "";

  items.forEach(item => {
    const titulo = item.title || item.name;
    const fecha = item.release_date || item.first_air_date || "Sin fecha";
    const posterUrl = item.poster_path
      ? `https://image.tmdb.org/t/p/w342${item.poster_path}`
      : "img/no-image.png";
    const rating = (item.vote_average !== undefined && item.vote_average !== null)
      ? item.vote_average.toFixed(1)
      : "N/A";

    if (!item.id || !titulo) return;

    const card = document.createElement("div");
    card.classList.add("movie-card");
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", `Ver detalles de ${titulo}`);

    card.innerHTML = `
      <img class="poster" src="${posterUrl}" alt="${titulo}">
      <div class="movie-info">
        <h3>${titulo}</h3>
        <div class="movie-meta">
          <span class="badge-rating">
            <i class="bi bi-star-fill"></i> ${rating}
          </span>
          <span><i class="bi bi-calendar-event me-1"></i>${fecha}</span>
        </div>
      </div>
    `;

    const open = () => cargarDetalles(item.id, item.media_type);
    card.addEventListener("click", open);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") open();
    });

    result.appendChild(card);
  });
};

/* Paginación mejor (centrada en la página actual) */
const generarPaginacion = (pagina, totalPaginas) => {
  pagination.innerHTML = "";

  const maxButtons = 7; // más pro que solo 1..10
  let start = Math.max(1, pagina - Math.floor(maxButtons / 2));
  let end = Math.min(totalPaginas, start + maxButtons - 1);
  start = Math.max(1, end - maxButtons + 1);

  // Prev
  const prev = document.createElement("button");
  prev.textContent = "«";
  prev.className = "btn btn-outline-warning mx-1";
  prev.disabled = pagina === 1;
  prev.addEventListener("click", () => buscarPeliculas(pagina - 1));
  pagination.appendChild(prev);

  for (let i = start; i <= end; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    btn.className = "btn btn-outline-warning mx-1";
    if (i === pagina) btn.classList.add("active");
    btn.addEventListener("click", () => buscarPeliculas(i));
    pagination.appendChild(btn);
  }

  // Next
  const next = document.createElement("button");
  next.textContent = "»";
  next.className = "btn btn-outline-warning mx-1";
  next.disabled = pagina === totalPaginas;
  next.addEventListener("click", () => buscarPeliculas(pagina + 1));
  pagination.appendChild(next);
};

/* =========================
   DETAILS MODAL
========================= */
const cargarDetalles = (id, tipo = "movie") => {
  modalDetails.innerHTML = `<div class="d-flex align-items-center gap-2">
    <span class="spinner-border" aria-hidden="true"></span>
    <span>Cargando detalles...</span>
  </div>`;

  const bsModal = new bootstrap.Modal(modal);
  bsModal.show();

  const baseURL = "https://api.themoviedb.org/3";
  const endpoints = {
    detalles: `${baseURL}/${tipo}/${id}?api_key=${tmdbKey}&language=es-ES`,
    imagenes: `${baseURL}/${tipo}/${id}/images?api_key=${tmdbKey}`,
    videos: `${baseURL}/${tipo}/${id}/videos?api_key=${tmdbKey}&language=es-ES`,
    creditos: `${baseURL}/${tipo}/${id}/credits?api_key=${tmdbKey}&language=es-ES`,
    reseñas: `${baseURL}/${tipo}/${id}/reviews?api_key=${tmdbKey}&language=es-ES`,
  };

  Promise.all([
    fetch(endpoints.detalles).then(r => r.json()),
    fetch(endpoints.imagenes).then(r => r.json()),
    fetch(endpoints.videos).then(r => r.json()),
    fetch(endpoints.creditos).then(r => r.json()),
    fetch(endpoints.reseñas).then(r => r.json())
  ])
  .then(([detalle, imagenes, videos, creditos, resenas]) => {
    const titulo = detalle.title || detalle.name || "Detalle";
    const poster = detalle.poster_path
      ? `https://image.tmdb.org/t/p/w500${detalle.poster_path}`
      : "img/no-image.png";

    let html = `
      <h2 class="text-center">${titulo}</h2>
      <img src="${poster}" class="img-fluid d-block mx-auto my-3 rounded" style="max-width: 260px;">
      <p><strong>Fecha:</strong> ${detalle.release_date || detalle.first_air_date || "N/A"}</p>
      <p><strong>Géneros:</strong> ${(detalle.genres || []).map(g => g.name).join(", ") || "N/A"}</p>
      <p><strong>Idioma original:</strong> ${(detalle.original_language || "N/A").toUpperCase()}</p>
      <p><strong>Promedio TMDb:</strong> ${detalle.vote_average} (${detalle.vote_count} votos)</p>
      <p><strong>Sinopsis:</strong> ${detalle.overview || "Sin descripción."}</p>
      <hr>
    `;

    if (imagenes && imagenes.backdrops && imagenes.backdrops.length > 0) {
      html += `<h4>Galería</h4>
        <div class="swiper mySwiper">
          <div class="swiper-wrapper">`;
      imagenes.backdrops.slice(0, 10).forEach(img => {
        html += `<div class="swiper-slide">
          <img src="https://image.tmdb.org/t/p/w780${img.file_path}" class="img-fluid">
        </div>`;
      });
      html += `</div>
          <div class="swiper-pagination"></div>
          <div class="swiper-button-next"></div>
          <div class="swiper-button-prev"></div>
        </div>
        <hr>`;
    }

    if (creditos && creditos.cast && creditos.cast.length > 0) {
      html += `<h4>Reparto principal</h4>
        <div class="d-flex gap-3 overflow-auto pb-2">`;
      creditos.cast.slice(0, 7).forEach(actor => {
        if (!actor.profile_path) return;
        html += `<div class="text-center" style="min-width:140px;">
          <img src="https://image.tmdb.org/t/p/w185${actor.profile_path}" class="rounded" style="height:120px; width:auto;">
          <p class="mb-0 fw-semibold">${actor.name}</p>
          <small class="text-muted">${actor.character || ""}</small>
        </div>`;
      });
      html += `</div><hr>`;
    }

    const ytTrailers = (videos && videos.results) ? videos.results.filter(v => v.site === "YouTube" && v.type === "Trailer") : [];
    if (ytTrailers.length > 0) {
      const v = ytTrailers[0];
      html += `<h4>Tráiler</h4>
        <p class="mb-2"><strong>${v.name}</strong></p>
        <div class="ratio ratio-16x9">
          <iframe src="https://www.youtube.com/embed/${v.key}" allowfullscreen></iframe>
        </div>
        <hr>`;
    }

    if (resenas && resenas.results && resenas.results.length > 0) {
      html += `<h4>Reseñas</h4>`;
      resenas.results.slice(0, 2).forEach(r => {
        const texto = (r.content || "").trim();
        html += `<p class="mb-1"><strong>${r.author}</strong></p>
                <p>${texto.substring(0, 360)}${texto.length > 360 ? "..." : ""}</p>`;
      });
      html += `<hr>`;
    }

    if (detalle.imdb_id) {
      html += `<div class="d-flex justify-content-center gap-3 flex-wrap mt-3">
        <a href="https://www.imdb.com/title/${detalle.imdb_id}" target="_blank" class="btn btn-warning fw-bold">
          <i class="bi bi-box-arrow-up-right me-1"></i> Ver en IMDb
        </a>
        <a href="https://api.whatsapp.com/send?text=Mira esto: ${encodeURIComponent(titulo)}%0Ahttps://www.imdb.com/title/${detalle.imdb_id}"
          target="_blank" class="btn btn-success fw-bold">
          <i class="bi bi-whatsapp me-1"></i> Compartir
        </a>
      </div>`;
    }

    modalDetails.innerHTML = html;

    // Init Swiper solo si existe
    const swiperEl = document.querySelector(".mySwiper");
    if (swiperEl) {
      new Swiper(".mySwiper", {
        loop: true,
        autoplay: { delay: 2500 },
        pagination: { el: ".swiper-pagination", clickable: true },
        navigation: { nextEl: ".swiper-button-next", prevEl: ".swiper-button-prev" }
      });
    }
  })
  .catch(() => {
    modalDetails.innerHTML = `
      <div class="alert alert-danger">
        <i class="bi bi-exclamation-triangle me-2"></i>
        No se pudieron cargar los detalles. Intenta nuevamente.
      </div>
    `;
  });
};

/* =========================
   EVENTS
========================= */
searchBtn.addEventListener("click", () => buscarPeliculas(1));

movieNameRef.addEventListener("keydown", (e) => {
  if (e.key === "Enter") buscarPeliculas(1);
});

filterSelect.addEventListener("change", () => {
  // Si aún no hay búsqueda, no forzamos
  if (movieNameRef.value.trim().length > 0) buscarPeliculas(1);
});
