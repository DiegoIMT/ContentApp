const movieNameRef = document.getElementById("movie-name");
const searchBtn = document.getElementById("search-btn");
const result = document.getElementById("result");
const modal = document.getElementById("movie-modal");
const modalDetails = document.getElementById("modal-details");
const pagination = document.getElementById("pagination");
const filterSelect = document.getElementById("media-filter");

let currentPage = 1;
let currentQuery = "";

const buscarPeliculas = (page = 1) => {
  const query = movieNameRef.value.trim();
  if (query.length <= 0) {
    result.innerHTML = "<h3 class='msg'>Por favor escribe un nombre</h3>";
    pagination.innerHTML = "";
    return;
  }

  currentQuery = query;
  const searchURL = `https://api.themoviedb.org/3/search/multi?api_key=${tmdbKey}&language=es-ES&query=${encodeURIComponent(query)}&page=${page}`;

  result.innerHTML = "<h3 class='msg'>Buscando...</h3>";
  fetch(searchURL)
    .then(res => res.json())
    .then(data => {
      if (!data.results || data.results.length === 0) {
        result.innerHTML = "<h3 class='msg'>No se encontraron resultados</h3>";
        pagination.innerHTML = "";
        return;
      }
      const filtro = filterSelect.value;
      const filtrados = data.results.filter(item => {
        if (filtro === "all") return item.media_type === "movie" || item.media_type === "tv";
        return item.media_type === filtro;
      });
      mostrarResultados(filtrados);
      generarPaginacion(data.page, data.total_pages);
    })
    .catch(() => {
      result.innerHTML = "<h3 class='msg'>Ocurrió un error</h3>";
      pagination.innerHTML = "";
    });
};

const mostrarResultados = (items) => {
  result.innerHTML = "";
  items.forEach(item => {
    const titulo = item.title || item.name;
    const fecha = item.release_date || item.first_air_date || "Sin fecha";
    const posterUrl = item.poster_path
      ? `https://image.tmdb.org/t/p/w342${item.poster_path}`
      : 'img/no-image.png';
    const rating = item.vote_average ?? 'N/A';

    // Validaciones clave para evitar tarjetas vacías o rotas
    if (!item.id || !titulo) return;

    const card = document.createElement("div");
    card.classList.add("movie-card");

    card.innerHTML = `
      <img class="poster" src="${posterUrl}" alt="${titulo}">
      <div class="movie-info">
        <h3>${titulo}</h3>
        <p><img src="star-icon.svg" style="width: 1em; vertical-align: middle;"> ${rating}</p>
        <p>${fecha}</p>
      </div>
    `;

    card.addEventListener("click", () => cargarDetalles(item.id, item.media_type));
    result.appendChild(card);
  });
};


const generarPaginacion = (pagina, totalPaginas) => {
  pagination.innerHTML = "";
  const max = Math.min(totalPaginas, 10);
  for (let i = 1; i <= max; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    btn.classList.add("btn", "btn-outline-warning", "mx-1");
    if (i === pagina) btn.classList.add("active");
    btn.addEventListener("click", () => buscarPeliculas(i));
    pagination.appendChild(btn);
  }
};

const cargarDetalles = (id, tipo = "movie") => {
  modalDetails.innerHTML = "<p>Cargando...</p>";
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
  ]).then(([detalle, imagenes, videos, creditos, resenas]) => {
    let titulo = detalle.title || detalle.name;
    let html = `
      <h2 class="text-center">${titulo}</h2>
      <img src="${detalle.poster_path ? `https://image.tmdb.org/t/p/w500${detalle.poster_path}` : 'img/no-image.png'}" class="img-fluid d-block mx-auto my-3 rounded" style="max-width: 250px;">
      <p><strong>Fecha de estreno:</strong> ${detalle.release_date || detalle.first_air_date}</p>
      <p><strong>Géneros:</strong> ${(detalle.genres || []).map(g => g.name).join(", ")}</p>
      <p><strong>Idioma original:</strong> ${detalle.original_language?.toUpperCase()}</p>
      <p><strong>Promedio TMDb:</strong> ${detalle.vote_average} (${detalle.vote_count} votos)</p>
      <p><strong>Sinopsis:</strong> ${detalle.overview}</p>
      <hr>
    `;

    if (imagenes.backdrops.length > 0) {
      html += `<h4>Galería:</h4><div class="swiper mySwiper"><div class="swiper-wrapper">`;
      imagenes.backdrops.slice(0, 10).forEach(img => {
        html += `<div class="swiper-slide"><img src="https://image.tmdb.org/t/p/w780${img.file_path}" class="img-fluid rounded"></div>`;
      });
      html += `</div><div class="swiper-pagination"></div><div class="swiper-button-next"></div><div class="swiper-button-prev"></div></div><hr>`;
    }

    if (creditos.cast && creditos.cast.length > 0) {
      html += `<h4>Reparto principal:</h4><div class="d-flex gap-3 overflow-auto">`;
      creditos.cast.slice(0, 5).forEach(actor => {
        if (actor.profile_path) {
          html += `<div class="text-center">
            <img src="https://image.tmdb.org/t/p/w185${actor.profile_path}" class="rounded" style="height:120px;">
            <p class="mb-0 fw-semibold">${actor.name}</p>
            <small class="text-muted">${actor.character}</small>
          </div>`;
        }
      });
      html += `</div><hr>`;
    }

    const ytTrailers = videos.results.filter(v => v.site === "YouTube" && v.type === "Trailer");
    if (ytTrailers.length > 0) {
      html += `<h4>Tráilers:</h4>`;
      ytTrailers.slice(0, 1).forEach(v => {
        html += `<p><strong>${v.name}</strong></p><div class="ratio ratio-16x9"><iframe src="https://www.youtube.com/embed/${v.key}" allowfullscreen></iframe></div>`;
      });
      html += `<hr>`;
    }

    if (resenas.results.length > 0) {
      html += `<h4>Reseñas:</h4>`;
      resenas.results.slice(0, 2).forEach(r => {
        html += `<p><strong>${r.author}</strong></p><p>${r.content.substring(0, 300)}...</p>`;
      });
      html += `<hr>`;
    }

    if (detalle.imdb_id) {
      html += `<div class="d-flex justify-content-center gap-3 flex-wrap mt-4">
        <a href="https://www.imdb.com/title/${detalle.imdb_id}" target="_blank" class="btn btn-warning">Ver en IMDb</a>
        <a href="https://api.whatsapp.com/send?text=Mira esta película: ${encodeURIComponent(titulo)}%0Ahttps://www.imdb.com/title/${detalle.imdb_id}" target="_blank" class="btn btn-success">Compartir en WhatsApp</a>
      </div>`;
    }

    modalDetails.innerHTML = html;
    new Swiper(".mySwiper", {
      loop: true,
      autoplay: { delay: 2500 },
      pagination: { el: ".swiper-pagination", clickable: true },
      navigation: { nextEl: ".swiper-button-next", prevEl: ".swiper-button-prev" }
    });
  });
};

searchBtn.addEventListener("click", () => buscarPeliculas());
movieNameRef.addEventListener("keydown", (e) => {
  if (e.key === "Enter") buscarPeliculas();
});
filterSelect.addEventListener("change", () => buscarPeliculas());
