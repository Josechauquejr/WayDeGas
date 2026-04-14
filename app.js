/* ════════════════════════════════════════════════════════
   CombustívelMZ — app.js
   Monitoramento colaborativo de combustível em Moçambique

   CONFIGURAÇÃO RÁPIDA:
   1. Substitua GOOGLE_FORM_URL pelo URL do seu Google Form
   2. Substitua SHEETS_JSON_URL pelo link JSON da sua Google Sheet
   3. Ajuste FORM_ENTRY_IDS com os entry IDs reais do seu form

   Para obter entry IDs:
   → Aceda à pré-visualização do form
   → Clique direito > Inspecionar > procure "entry.XXXXXXXXXX"
════════════════════════════════════════════════════════ */

"use strict";

/* ─────────────────────────────────────────────
   CONFIG — ALTERE AQUI COM OS SEUS IDs REAIS
───────────────────────────────────────────── */
const CONFIG = {
  // URL de submissão do Google Form
  GOOGLE_FORM_URL: "https://docs.google.com/forms/d/e/SEU_FORM_ID/formResponse",

  // URL JSON público da Google Sheet (respostas do form)
  // Formato: https://docs.google.com/spreadsheets/d/SEU_SHEET_ID/gviz/tq?tqx=out:json
  SHEETS_JSON_URL:
    "https://docs.google.com/spreadsheets/d/SEU_SHEET_ID/gviz/tq?tqx=out:json",

  // Entry IDs do Google Form — substitua pelos reais
  FORM_ENTRY_IDS: {
    name: "entry.1111111111",
    province: "entry.2222222222",
    city: "entry.3333333333",
    neighborhood: "entry.4444444444",
    status: "entry.5555555555",
    queueSize: "entry.6666666666",
    fuelType: "entry.7777777777",
    notes: "entry.8888888888",
  },

  // Intervalo de atualização automática (ms)
  REFRESH_INTERVAL: 2 * 60 * 1000, // 2 minutos

  // Dados expiram após este tempo (ms)
  STALE_THRESHOLD: 60 * 60 * 1000, // 1 hora

  // Foco padrão para o filtro Maputo
  MAPUTO_CENTER: [-25.9653, 32.5892],
  MAPUTO_ZOOM: 11,

  // Distância considerada "perto de mim"
  NEARBY_RADIUS_KM: 20,
  NEARBY_MAX_RESULTS: 50,

  // Usar dados mock enquanto não configurado
  USE_MOCK: true,
};

/* ─────────────────────────────────────────────
   DADOS MOCK (para demonstração)
───────────────────────────────────────────── */
const MOCK_STATIONS = [
  {
    id: "mock_1",
    name: "Petromoc Sommerschield",
    province: "Maputo Cidade",
    city: "Maputo",
    neighborhood: "Sommerschield",
    status: "available",
    queueSize: "short",
    fuelType: "both",
    notes: "Gasolina e diesel disponíveis. Fila pequena.",
    confirmations: 7,
    timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(), // 12 min atrás
    lat: -25.9612,
    lng: 32.5799,
  },
  {
    id: "mock_2",
    name: "Galp Polana",
    province: "Maputo Cidade",
    city: "Maputo",
    neighborhood: "Polana",
    status: "queue",
    queueSize: "long",
    fuelType: "gasoline",
    notes: "Fila grande, apenas gasolina. Diesel em falta.",
    confirmations: 3,
    timestamp: new Date(Date.now() - 28 * 60 * 1000).toISOString(),
    lat: -25.97,
    lng: 32.5912,
  },
  {
    id: "mock_3",
    name: "Total Baixa",
    province: "Maputo Cidade",
    city: "Maputo",
    neighborhood: "Baixa",
    status: "empty",
    queueSize: "none",
    fuelType: "both",
    notes: "Sem combustível. Aguardam abastecimento.",
    confirmations: 12,
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    lat: -25.9659,
    lng: 32.5756,
  },
  {
    id: "mock_4",
    name: "Petromoc Machava",
    province: "Maputo Província",
    city: "Matola",
    neighborhood: "Machava",
    status: "available",
    queueSize: "none",
    fuelType: "diesel",
    notes: "Diesel disponível, sem fila. Gasolina em falta.",
    confirmations: 5,
    timestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    lat: -25.9339,
    lng: 32.4571,
  },
  {
    id: "mock_5",
    name: "BP Beira Centro",
    province: "Sofala",
    city: "Beira",
    neighborhood: "Centro",
    status: "queue",
    queueSize: "medium",
    fuelType: "both",
    notes: "Fila média, ambos combustíveis disponíveis.",
    confirmations: 2,
    timestamp: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
    lat: -19.8437,
    lng: 34.8389,
  },
  {
    id: "mock_6",
    name: "Enacal Nampula",
    province: "Nampula",
    city: "Nampula",
    neighborhood: "Centro",
    status: "available",
    queueSize: "none",
    fuelType: "gasoline",
    notes: "Gasolina disponível sem fila.",
    confirmations: 4,
    timestamp: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
    lat: -15.1165,
    lng: 39.2666,
  },
  {
    id: "mock_7",
    name: "Total Maputo Sul",
    province: "Maputo Cidade",
    city: "Maputo",
    neighborhood: "Catembe",
    status: "empty",
    queueSize: "none",
    fuelType: "both",
    notes: "Sem combustível há mais de 3 horas.",
    confirmations: 8,
    timestamp: new Date(Date.now() - 70 * 60 * 1000).toISOString(), // 1h10 — expirado
    lat: -26.0031,
    lng: 32.5847,
  },
  {
    id: "mock_8",
    name: "Galp Tete",
    province: "Tete",
    city: "Tete",
    neighborhood: "Matundo",
    status: "available",
    queueSize: "short",
    fuelType: "diesel",
    notes: "Diesel disponível. Gasolina a chegar amanhã.",
    confirmations: 1,
    timestamp: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    lat: -16.1564,
    lng: 33.5867,
  },
];

/* ─────────────────────────────────────────────
   ESTADO DA APLICAÇÃO
───────────────────────────────────────────── */
const APP = {
  stations: [],
  filtered: [],
  activeFilter: "all",
  searchQuery: "",
  userLat: null,
  userLng: null,
  map: null,
  mapProvider: "none", // "google" | "leaflet" | "none"
  infoWindow: null,
  markers: {},
  userMarker: null,
  userCircle: null,
  userLocationLayer: null,
  refreshTimer: null,
  confirmations: {}, // { stationId: count } — persistido em localStorage
};

/* ─────────────────────────────────────────────
   UTILITÁRIOS
───────────────────────────────────────────── */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

/** Formata duração em minutos/horas desde timestamp */
function timeAgo(isoString) {
  const diff = Math.floor((Date.now() - new Date(isoString)) / 1000);
  if (diff < 60) return `${diff}s atrás`;
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`;
  return `${Math.floor(diff / 3600)}h atrás`;
}

/** Verifica se o dado é antigo (> STALE_THRESHOLD) */
function isStale(isoString) {
  return Date.now() - new Date(isoString) > CONFIG.STALE_THRESHOLD;
}

/** Verifica se é recente (< 30 min) */
function isRecent(isoString) {
  return Date.now() - new Date(isoString) < 30 * 60 * 1000;
}

/** Calcula distância em km (Haversine) */
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Opções de status com ícones reais */
const STATUS_OPTIONS = {
  available: { label: "Disponível", icon: "check_circle", cls: "available" },
  queue: { label: "Com fila", icon: "schedule", cls: "queue" },
  empty: { label: "Sem combustível", icon: "block", cls: "empty" },
  unknown: { label: "Sem classificação", icon: "help_outline", cls: "unknown" },
};

const QUEUE_LABEL = {
  none: "Sem fila",
  short: "Fila curta",
  medium: "Fila média",
  long: "Fila longa",
};

const FUEL_OPTIONS = {
  both: { label: "Gasolina + Diesel", icon: "local_gas_station" },
  gasoline: { label: "Gasolina", icon: "local_gas_station" },
  diesel: { label: "Diesel", icon: "oil_barrel" },
};

function renderIcon(iconId) {
  return `<span class="material-symbols-outlined icon-inline" aria-hidden="true">${iconId}</span>`;
}

function getStatusBadge(status) {
  const option = STATUS_OPTIONS[status] || STATUS_OPTIONS.unknown;
  return `<span class="status-badge ${option.cls}">${renderIcon(option.icon)}<span>${option.label}</span></span>`;
}

function getFuelLabel(fuelType) {
  const option = FUEL_OPTIONS[fuelType];
  if (!option) return "";
  return `<span class="meta-pill fuel">${renderIcon(option.icon)}<span>${option.label}</span></span>`;
}

function getDistancePill(station) {
  if (typeof station.distance !== "number") return "";
  return `<span class="meta-pill distance">${renderIcon("location_on")} ${station.distance.toFixed(1)} km</span>`;
}

function getEffectiveStatus(station) {
  if (!station.status || isStale(station.timestamp)) return "unknown";
  return station.status;
}

function annotateDistances(stations) {
  if (APP.userLat === null || APP.userLng === null) return;
  stations.forEach((station) => {
    if (station.lat && station.lng) {
      station.distance = haversine(
        APP.userLat,
        APP.userLng,
        station.lat,
        station.lng,
      );
    } else {
      station.distance = null;
    }
  });
}

function sortStationsByFreshnessAndTime(stations) {
  return stations.sort((a, b) => {
    const aStale = isStale(a.timestamp) ? 1 : 0;
    const bStale = isStale(b.timestamp) ? 1 : 0;

    if (aStale !== bStale) return aStale - bStale;
    return new Date(b.timestamp) - new Date(a.timestamp);
  });
}

function isMaputoStation(station) {
  const locationText =
    `${station.province || ""} ${station.city || ""} ${station.neighborhood || ""}`.toLowerCase();
  return locationText.includes("maputo") || locationText.includes("matola");
}

function updateLocationBanner() {
  const banner = $("#locationBanner");
  if (!banner) return;

  if (APP.activeFilter === "maputo") {
    banner.innerHTML = `${renderIcon("map")} A mostrar ${APP.filtered.length} bombas em Maputo e arredores.`;
    banner.classList.remove("hidden");
    return;
  }

  if (APP.userLat === null) {
    banner.textContent =
      "Localização não disponível. Ative o GPS para ver as bombas mais próximas.";
    banner.classList.remove("hidden");
    return;
  }

  if (APP.activeFilter === "near") {
    if (APP.filtered.length > 0) {
      banner.innerHTML = `${renderIcon("location_on")} A mostrar ${APP.filtered.length} bombas num raio de ${CONFIG.NEARBY_RADIUS_KM} km da sua localização.`;
    } else {
      banner.innerHTML = `${renderIcon("location_off")} Não foram encontradas bombas no raio de ${CONFIG.NEARBY_RADIUS_KM} km.`;
    }
  } else {
    banner.innerHTML = `${renderIcon("location_on")} Localização ativa. Use o filtro “Perto de mim” para ver as bombas mais próximas.`;
  }
  banner.classList.remove("hidden");
}

/** Mostra toast temporário */
function showToast(msg, duration = 3000) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.add("hidden"), duration);
}

/* ─────────────────────────────────────────────
   LOCAL STORAGE — confirmações & cache
───────────────────────────────────────────── */
function loadConfirmations() {
  try {
    APP.confirmations = JSON.parse(
      localStorage.getItem("cmz_confirms") || "{}",
    );
  } catch {
    APP.confirmations = {};
  }
}

function saveConfirmations() {
  localStorage.setItem("cmz_confirms", JSON.stringify(APP.confirmations));
}

function loadCachedStations() {
  try {
    const raw = localStorage.getItem("cmz_stations");
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    // Cache válido por 5 minutos
    if (Date.now() - ts < 5 * 60 * 1000) return data;
  } catch {}
  return null;
}

function cacheStations(data) {
  localStorage.setItem(
    "cmz_stations",
    JSON.stringify({ data, ts: Date.now() }),
  );
}

/* ─────────────────────────────────────────────
   MAPA GOOGLE MAPS + FALLBACK LEAFLET
───────────────────────────────────────────── */
function initMap() {
  const canUseGoogle =
    !!window.google && !!window.google.maps && !window.__gmAuthFailed;

  if (canUseGoogle) {
    APP.mapProvider = "google";
    APP.map = new google.maps.Map(document.getElementById("map"), {
      center: { lat: -18.7, lng: 35.3 }, // Centro de Moçambique
      zoom: 5,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    });
    APP.infoWindow = new google.maps.InfoWindow();
    return;
  }

  if (window.L) {
    APP.mapProvider = "leaflet";
    APP.map = L.map("map", {
      center: [-18.7, 35.3],
      zoom: 5,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org">OpenStreetMap</a> &copy; <a href="https://carto.com">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(APP.map);

    showToast("Google Maps indisponível. A usar mapa alternativo.");
    return;
  }

  APP.mapProvider = "none";
  const mapEl = document.getElementById("map");
  if (mapEl) {
    mapEl.innerHTML =
      '<div style="padding:16px;color:#f5a623;font-family:Space Mono,monospace">Não foi possível carregar nenhum provedor de mapa.</div>';
  }
}

/** Cria ícone circular colorido para o marcador */
function createMarkerIcon(status) {
  const colors = {
    available: "#22c55e",
    queue: "#eab308",
    empty: "#ef4444",
    unknown: "#8b8b8b",
  };
  const color = colors[status] || "#888";

  if (APP.mapProvider === "google") {
    return {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 7,
      fillColor: color,
      fillOpacity: 1,
      strokeColor: "#111",
      strokeWeight: 3,
    };
  }

  if (APP.mapProvider === "leaflet") {
    return L.divIcon({
      className: "",
      html: `<div style="
        width:16px; height:16px;
        background:${color};
        border:3px solid rgba(0,0,0,.6);
        border-radius:50%;
        box-shadow:0 0 8px ${color}88;
      "></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
      popupAnchor: [0, -12],
    });
  }

  return null;
}

function getPopupContent(station) {
  const effectiveStatus = getEffectiveStatus(station);
  return `
    <div style="min-width:180px">
      <strong style="font-size:14px;color:${effectiveStatus === "available" ? "#22c55e" : effectiveStatus === "queue" ? "#eab308" : effectiveStatus === "empty" ? "#ef4444" : "#aaa"}">${station.name}</strong><br/>
      <span style="font-size:11px;color:#888">${station.neighborhood}, ${station.city}</span><br/><br/>
      ${getStatusBadge(effectiveStatus)}<br/>
      <span style="font-size:11px">${getFuelLabel(station.fuelType) || ""}</span><br/>
      <span style="font-size:11px;color:#888">${timeAgo(station.timestamp)}</span>
      ${station.notes ? `<br/><em style="font-size:11px;color:#aaa">${station.notes}</em>` : ""}
    </div>
  `;
}

function openStationPopup(stationId) {
  if (!APP.map) return;
  const marker = APP.markers[stationId];
  const station = APP.stations.find((s) => s.id === stationId);
  if (!marker || !station) return;

  if (APP.mapProvider === "google") {
    if (!APP.infoWindow) return;
    APP.infoWindow.setContent(getPopupContent(station));
    APP.infoWindow.open({
      map: APP.map,
      anchor: marker,
      shouldFocus: false,
    });
    return;
  }

  if (APP.mapProvider === "leaflet") {
    marker.openPopup();
  }
}

/** Atualiza marcadores no mapa */
function updateMapMarkers(stations) {
  if (!APP.map || APP.mapProvider === "none") return;

  // Remove marcadores antigos que não existem mais
  const currentIds = new Set(stations.map((s) => s.id));
  for (const [id, marker] of Object.entries(APP.markers)) {
    if (!currentIds.has(id)) {
      if (APP.mapProvider === "google") marker.setMap(null);
      if (APP.mapProvider === "leaflet") APP.map.removeLayer(marker);
      delete APP.markers[id];
    }
  }

  stations.forEach((s) => {
    if (!s.lat || !s.lng) return;
    const effectiveStatus = getEffectiveStatus(s);
    const position = { lat: s.lat, lng: s.lng };

    if (APP.mapProvider === "google") {
      if (APP.markers[s.id]) {
        APP.markers[s.id].setPosition(position);
        APP.markers[s.id].setIcon(createMarkerIcon(effectiveStatus));
        APP.markers[s.id].setTitle(s.name);
      } else {
        APP.markers[s.id] = new google.maps.Marker({
          position,
          map: APP.map,
          title: s.name,
          icon: createMarkerIcon(effectiveStatus),
        });
      }

      google.maps.event.clearInstanceListeners(APP.markers[s.id]);
      APP.markers[s.id].addListener("click", () => openStationPopup(s.id));
      return;
    }

    const leafletPosition = [s.lat, s.lng];
    if (APP.markers[s.id]) {
      APP.markers[s.id].setLatLng(leafletPosition);
      APP.markers[s.id].setIcon(createMarkerIcon(effectiveStatus));
      APP.markers[s.id].setPopupContent(getPopupContent(s));
    } else {
      APP.markers[s.id] = L.marker(leafletPosition, {
        icon: createMarkerIcon(effectiveStatus),
      })
        .addTo(APP.map)
        .bindPopup(getPopupContent(s));
    }
  });
}

/** Foca o mapa numa bomba específica */
function focusStation(station) {
  if (!APP.map || !station.lat || !station.lng) return;

  if (APP.mapProvider === "google") {
    APP.map.panTo({ lat: station.lat, lng: station.lng });
    APP.map.setZoom(14);
    openStationPopup(station.id);
    return;
  }

  APP.map.flyTo([station.lat, station.lng], 14, { duration: 1.2 });
  openStationPopup(station.id);
}

function fitMapToStations(
  stations,
  { includeUser = false, maxZoom = 14 } = {},
) {
  if (!APP.map || APP.mapProvider === "none") return;

  if (APP.mapProvider === "google") {
    const bounds = new google.maps.LatLngBounds();
    let totalPoints = 0;
    let firstPoint = null;

    stations.forEach((s) => {
      if (!s.lat || !s.lng) return;
      const point = { lat: s.lat, lng: s.lng };
      bounds.extend(point);
      totalPoints += 1;
      if (!firstPoint) firstPoint = point;
    });

    if (includeUser && APP.userLat !== null && APP.userLng !== null) {
      const point = { lat: APP.userLat, lng: APP.userLng };
      bounds.extend(point);
      totalPoints += 1;
      if (!firstPoint) firstPoint = point;
    }

    if (!totalPoints || !firstPoint) return;
    if (totalPoints === 1) {
      APP.map.panTo(firstPoint);
      APP.map.setZoom(maxZoom);
      return;
    }

    APP.map.fitBounds(bounds, 60);
    google.maps.event.addListenerOnce(APP.map, "idle", () => {
      if (APP.map.getZoom() > maxZoom) APP.map.setZoom(maxZoom);
    });
    return;
  }

  const points = stations
    .filter((s) => s.lat && s.lng)
    .map((s) => [s.lat, s.lng]);

  if (includeUser && APP.userLat !== null && APP.userLng !== null) {
    points.push([APP.userLat, APP.userLng]);
  }

  if (!points.length) return;
  if (points.length === 1) {
    APP.map.flyTo(points[0], maxZoom, { duration: 0.9 });
    APP.map.setZoom(maxZoom);
    return;
  }

  const bounds = L.latLngBounds(points);
  APP.map.fitBounds(bounds.pad(0.25), { maxZoom });
}

function focusMapForCurrentFilter(stations) {
  if (!APP.map) return;

  const flyTo = (lat, lng, zoom) => {
    if (APP.mapProvider === "google") {
      APP.map.panTo({ lat, lng });
      APP.map.setZoom(zoom);
      return;
    }
    APP.map.flyTo([lat, lng], zoom, { duration: 0.9 });
  };

  if (APP.activeFilter === "maputo") {
    if (stations.some((s) => s.lat && s.lng)) {
      fitMapToStations(stations, { maxZoom: CONFIG.MAPUTO_ZOOM + 1 });
    } else {
      flyTo(CONFIG.MAPUTO_CENTER[0], CONFIG.MAPUTO_CENTER[1], CONFIG.MAPUTO_ZOOM);
    }
    return;
  }

  if (APP.activeFilter === "near") {
    if (!stations.length && APP.userLat !== null && APP.userLng !== null) {
      flyTo(APP.userLat, APP.userLng, 12);
      return;
    }

    fitMapToStations(stations, {
      includeUser: true,
      maxZoom: 15,
    });
  }
}

/* ─────────────────────────────────────────────
   RENDERIZAÇÃO DA LISTA
───────────────────────────────────────────── */
function renderList(stations) {
  const list = $("#stationList");
  const spinner = $("#loadingSpinner");
  const empty = $("#emptyState");

  spinner.classList.add("hidden");

  if (!stations.length) {
    empty.classList.remove("hidden");
    list.innerHTML = "";
    return;
  }
  empty.classList.add("hidden");

  list.innerHTML = stations
    .map((s) => {
      const stale = isStale(s.timestamp);
      const recent = isRecent(s.timestamp);
      const effectiveStatus = getEffectiveStatus(s);
      const confirms = (APP.confirmations[s.id] || 0) + (s.confirmations || 0);
      const myConfirmed = !!APP.confirmations[s.id];
      const reportButton =
        effectiveStatus === "unknown"
          ? `
          <button type="button" class="report-station-btn" data-id="${s.id}" aria-label="Reportar esta bomba">
            ${renderIcon("report")}<span>Reportar</span>
          </button>`
          : "";

      return `
    <div class="station-card ${effectiveStatus}${stale ? " stale" : ""}"
         data-id="${s.id}"
         tabindex="0"
         role="button"
         aria-label="${s.name} — ${STATUS_OPTIONS[effectiveStatus].label}">

      <div class="card-top">
        <span class="card-name">${s.name}</span>
        ${getStatusBadge(effectiveStatus)}
      </div>

      <div class="card-location">
        ${renderIcon("location_on")} ${s.neighborhood} · ${s.city} · ${s.province}
      </div>

      <div class="card-meta">
        ${getFuelLabel(s.fuelType)}
        ${s.queueSize && s.queueSize !== "none" ? `<span class="meta-pill queue-sz">${QUEUE_LABEL[s.queueSize]}</span>` : ""}
        ${getDistancePill(s)}
        <span class="meta-pill time ${recent ? "fresh" : ""}">
          ${stale ? "Expirado" : timeAgo(s.timestamp)}
        </span>
        ${recent ? '<span class="meta-pill fresh">Recente</span>' : ""}
        ${s.notes ? `<span class="meta-pill" title="${s.notes}">Nota disponível</span>` : ""}
      </div>

      <div class="card-bottom">
        <button class="confirm-btn ${myConfirmed ? "confirmed" : ""}"
                data-id="${s.id}"
                aria-label="Confirmar informação">
          ${myConfirmed ? "Confirmado" : "Confirmar"}
        </button>
        ${reportButton}
        <span class="confirm-count">${confirms} confirmação${confirms !== 1 ? "ões" : ""}</span>
      </div>
    </div>`;
    })
    .join("");

  // Event listeners nas cards
  $$(".station-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      if (
        e.target.closest(".confirm-btn") ||
        e.target.closest(".report-station-btn")
      )
        return;
      const station = APP.stations.find((s) => s.id === card.dataset.id);
      if (station) focusStation(station);
    });
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter") card.click();
    });
  });

  // Event listeners nos botões confirmar
  $$(".confirm-btn").forEach((btn) => {
    btn.addEventListener("click", () => handleConfirm(btn.dataset.id));
  });

  // Event listeners nos botões de reporte direto
  $$(".report-station-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const station = APP.stations.find((s) => s.id === btn.dataset.id);
      if (station) openReportForStation(station);
    });
  });
}

/** Atualiza os contadores de estatísticas no header */
function updateStats(stations) {
  const valid = stations.filter((s) => !isStale(s.timestamp));
  $("#statTotal").textContent = valid.length;
  $("#statAvail").textContent = valid.filter(
    (s) => s.status === "available",
  ).length;
  $("#statQueue").textContent = valid.filter(
    (s) => s.status === "queue",
  ).length;
  $("#statEmpty").textContent = valid.filter(
    (s) => s.status === "empty",
  ).length;

  const now = new Date();
  $("#lastUpdate").textContent =
    `Atualizado ${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
}

/* ─────────────────────────────────────────────
   FILTROS E BUSCA
───────────────────────────────────────────── */
function applyFilters() {
  annotateDistances(APP.stations);
  let result = [...APP.stations];

  // Filtro de busca
  if (APP.searchQuery) {
    const q = APP.searchQuery.toLowerCase();
    result = result.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q) ||
        s.neighborhood.toLowerCase().includes(q) ||
        s.province.toLowerCase().includes(q),
    );
  }

  // Filtros de estado
  switch (APP.activeFilter) {
    case "available":
      result = result.filter(
        (s) => s.status === "available" && !isStale(s.timestamp),
      );
      break;
    case "no-queue":
      result = result.filter(
        (s) =>
          s.status === "available" &&
          (!s.queueSize || s.queueSize === "none") &&
          !isStale(s.timestamp),
      );
      break;
    case "recent":
      result = result.filter((s) => isRecent(s.timestamp));
      break;
    case "maputo":
      result = sortStationsByFreshnessAndTime(result.filter(isMaputoStation));
      break;
    case "near":
      if (APP.userLat !== null && APP.userLng !== null) {
        result = result
          .filter(
            (s) =>
              s.lat &&
              s.lng &&
              typeof s.distance === "number" &&
              s.distance <= CONFIG.NEARBY_RADIUS_KM,
          )
          .sort((a, b) => a.distance - b.distance)
          .slice(0, CONFIG.NEARBY_MAX_RESULTS);
      } else {
        result = [];
      }
      break;
    default:
      // Mostrar todos mas expirados por último
      sortStationsByFreshnessAndTime(result);
  }

  APP.filtered = result;
  renderList(result);
  updateMapMarkers(result);
  updateStats(APP.stations);
  updateLocationBanner();
  focusMapForCurrentFilter(result);
}

/* ─────────────────────────────────────────────
   CONFIRMAÇÃO DE COMUNIDADE
───────────────────────────────────────────── */
function handleConfirm(stationId) {
  if (APP.confirmations[stationId]) {
    showToast("Já confirmou esta informação!");
    return;
  }
  APP.confirmations[stationId] = 1;
  saveConfirmations();
  applyFilters(); // re-render
  showToast("✅ Informação confirmada! Obrigado.");
}

/* ─────────────────────────────────────────────
   GEOLOCALIZAÇÃO
───────────────────────────────────────────── */
function requestGeolocation() {
  if (!navigator.geolocation) {
    showToast("Geolocalização não disponível neste navegador.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      APP.userLat = pos.coords.latitude;
      APP.userLng = pos.coords.longitude;

      // Adiciona/atualiza marcador da localização do utilizador
      if (APP.mapProvider === "google") {
        if (APP.userMarker) APP.userMarker.setMap(null);
        if (APP.userCircle) APP.userCircle.setMap(null);

        const userPosition = { lat: APP.userLat, lng: APP.userLng };

        APP.userMarker = new google.maps.Marker({
          position: userPosition,
          map: APP.map,
          title: "A sua localização",
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 7,
            fillColor: "#f5a623",
            fillOpacity: 1,
            strokeColor: "#111",
            strokeWeight: 2,
          },
        });

        APP.userCircle = new google.maps.Circle({
          map: APP.map,
          center: userPosition,
          radius: CONFIG.NEARBY_RADIUS_KM * 1000,
          strokeColor: "#f5a623",
          strokeOpacity: 0.8,
          strokeWeight: 1,
          fillColor: "#f5a623",
          fillOpacity: 0.14,
        });

        APP.userMarker.addListener("click", () => {
          if (!APP.infoWindow) return;
          APP.infoWindow.setContent(
            `A sua localização (${CONFIG.NEARBY_RADIUS_KM} km)`,
          );
          APP.infoWindow.open({
            map: APP.map,
            anchor: APP.userMarker,
            shouldFocus: false,
          });
        });
      } else if (APP.mapProvider === "leaflet" && APP.map) {
        if (APP.userMarker) APP.map.removeLayer(APP.userMarker);
        if (APP.userCircle) APP.map.removeLayer(APP.userCircle);
        if (APP.userLocationLayer) APP.map.removeLayer(APP.userLocationLayer);

        APP.userMarker = L.marker([APP.userLat, APP.userLng]).addTo(APP.map);
        APP.userCircle = L.circle([APP.userLat, APP.userLng], {
          color: "#f5a623",
          fillColor: "#f5a623",
          fillOpacity: 0.18,
          radius: CONFIG.NEARBY_RADIUS_KM * 1000,
        }).addTo(APP.map);
        APP.userLocationLayer = APP.userCircle;

        APP.userMarker.bindPopup(
          `A sua localização (${CONFIG.NEARBY_RADIUS_KM} km)`,
        );
      }

      // Activa chip "perto de mim"
      const nearChip = $('[data-filter="near"]');
      if (nearChip) nearChip.disabled = false;

      showToast("Localização captada. Agora pode ver as bombas mais próximas.");
      applyFilters();
    },
    () => {
      showToast("Não foi possível obter a localização. Use a pesquisa manual.");
      updateLocationBanner();
    },
  );
}

/* ─────────────────────────────────────────────
   CARREGAMENTO DE DADOS
───────────────────────────────────────────── */

/** Converte linha da Google Sheets para objeto station */
function sheetsRowToStation(row, index) {
  // Colunas esperadas (pela ordem das perguntas do form):
  // 0: Timestamp, 1: Nome, 2: Província, 3: Cidade, 4: Bairro,
  // 5: Status, 6: Fila, 7: Combustível, 8: Observações
  const cols = row.c || [];
  const get = (i) => (cols[i] && cols[i].v != null ? String(cols[i].v) : "");

  return {
    id: `sheet_${index}`,
    timestamp: get(0) || new Date().toISOString(),
    name: get(1) || "Bomba sem nome",
    province: get(2) || "",
    city: get(3) || "",
    neighborhood: get(4) || "",
    status: get(5) || "",
    queueSize: get(6) || "none",
    fuelType: get(7) || "both",
    notes: get(8) || "",
    confirmations: 0,
    lat: null,
    lng: null,
  };
}

/** Carrega dados do Google Sheets */
async function loadFromSheets() {
  try {
    const res = await fetch(CONFIG.SHEETS_JSON_URL);
    if (!res.ok) throw new Error("HTTP " + res.status);

    let text = await res.text();
    // A API retorna JSONP: google.visualization.Query.setResponse({...});
    text = text.replace(/^[^(]+\(/, "").replace(/\);?\s*$/, "");

    const json = JSON.parse(text);
    const rows = (json.table && json.table.rows) || [];

    return rows.slice(1).map(sheetsRowToStation); // ignora cabeçalho
  } catch (err) {
    console.warn(
      "[CombustívelMZ] Falha ao carregar Google Sheets:",
      err.message,
    );
    return null;
  }
}

/** Ponto de entrada de carregamento de dados */
async function loadData(showSpinner = true) {
  if (showSpinner) {
    $("#loadingSpinner").classList.remove("hidden");
    $("#emptyState").classList.add("hidden");
  }

  let stations = null;

  if (!CONFIG.USE_MOCK) {
    // Tenta cache local primeiro
    stations = loadCachedStations();

    if (!stations) {
      stations = await loadFromSheets();
      if (stations) cacheStations(stations);
    }
  }

  // Fallback para dados mock
  if (!stations || stations.length === 0) {
    stations = MOCK_STATIONS;
  }

  APP.stations = stations;
  applyFilters();
}

/* ─────────────────────────────────────────────
   ENVIO DO FORMULÁRIO (Google Forms)
───────────────────────────────────────────── */
async function submitReport(formData) {
  // Se não configurado, simula envio
  if (CONFIG.USE_MOCK || CONFIG.GOOGLE_FORM_URL.includes("SEU_FORM_ID")) {
    await new Promise((r) => setTimeout(r, 800)); // simula latência
    return { success: true, mock: true };
  }

  try {
    await fetch(CONFIG.GOOGLE_FORM_URL, {
      method: "POST",
      mode: "no-cors",
      body: formData,
    });
    return { success: true };
  } catch (err) {
    console.error("[CombustívelMZ] Falha ao enviar:", err);
    return { success: false, error: err.message };
  }
}

/* ─────────────────────────────────────────────
   MODAL DO FORMULÁRIO
───────────────────────────────────────────── */
function openModal() {
  $("#reportStationHint").classList.add("hidden");
  $("#reportModal").classList.remove("hidden");
  document.body.style.overflow = "hidden";
  setTimeout(() => $("#f_name").focus(), 100);
}

function openReportForStation(station) {
  $("#reportStationHint").classList.remove("hidden");
  $("#reportStationHint").textContent =
    `${station.name} não tem classificação recente. Por favor, reporte o estado atual.`;
  $("#f_name").value = station.name || "";
  $("#f_province").value = station.province || "";
  $("#f_city").value = station.city || "";
  $("#f_neighborhood").value = station.neighborhood || "";
  openModal();
}

function closeModal() {
  $("#reportModal").classList.add("hidden");
  document.body.style.overflow = "";
  $("#reportForm").reset();
  const msg = $("#formMessage");
  msg.classList.add("hidden");
  msg.className = "form-msg hidden";
}

function showFormMessage(text, type) {
  const msg = $("#formMessage");
  msg.textContent = text;
  msg.className = `form-msg ${type}`;
  msg.classList.remove("hidden");
}

/* ─────────────────────────────────────────────
   VALIDAÇÃO DO FORMULÁRIO
───────────────────────────────────────────── */
function validateForm(form) {
  let valid = true;
  const required = form.querySelectorAll("[required]");

  required.forEach((field) => {
    field.classList.remove("error");
    const isEmpty = !field.value.trim();

    if (field.type === "radio") {
      const group = form.querySelectorAll(`[name="${field.name}"]`);
      const checked = [...group].some((r) => r.checked);
      if (!checked) {
        group.forEach((r) =>
          r.closest(".radio-opt")?.classList.add("error-radio"),
        );
        valid = false;
      }
      return;
    }

    if (isEmpty) {
      field.classList.add("error");
      valid = false;
    }
  });

  return valid;
}

/* ─────────────────────────────────────────────
   EVENT LISTENERS
───────────────────────────────────────────── */
function initEventListeners() {
  // Botão abrir modal
  $("#openReportBtn").addEventListener("click", openModal);
  $("#closeModalBtn").addEventListener("click", closeModal);
  $("#cancelBtn").addEventListener("click", closeModal);

  // Fechar modal ao clicar fora
  $("#reportModal").addEventListener("click", (e) => {
    if (e.target === $("#reportModal")) closeModal();
  });

  // Escape fecha modal
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  // Busca
  $("#searchInput").addEventListener("input", (e) => {
    APP.searchQuery = e.target.value.trim();
    const clearBtn = $("#clearSearch");
    clearBtn.classList.toggle("visible", APP.searchQuery.length > 0);
    applyFilters();
  });

  $("#clearSearch").addEventListener("click", () => {
    $("#searchInput").value = "";
    APP.searchQuery = "";
    $("#clearSearch").classList.remove("visible");
    applyFilters();
  });

  // Chips de filtro
  $$(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      $$(".chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      APP.activeFilter = chip.dataset.filter;

      if (APP.activeFilter === "near" && APP.userLat === null) {
        requestGeolocation();
        showToast("📍 A detectar localização…");
      }

      applyFilters();
    });
  });

  // Submissão do formulário
  $("#reportForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const form = e.target;
    if (!validateForm(form)) {
      showFormMessage(
        "❌ Por favor preencha todos os campos obrigatórios.",
        "error",
      );
      return;
    }

    const submitBtn = $("#submitBtn");
    submitBtn.textContent = "A enviar…";
    submitBtn.disabled = true;

    const formData = new FormData(form);
    const result = await submitReport(formData);

    submitBtn.textContent = "Enviar Reporte";
    submitBtn.disabled = false;

    if (result.success) {
      const mockNote = result.mock
        ? " (modo demo — configure o Google Forms para envio real)"
        : "";
      showFormMessage(`✅ Reporte enviado com sucesso!${mockNote}`, "success");
      form.reset();

      // Se mock, adiciona à lista temporariamente
      if (result.mock) {
        const tempStation = {
          id: "temp_" + Date.now(),
          name: formData.get(CONFIG.FORM_ENTRY_IDS.name) || "Nova bomba",
          province: formData.get(CONFIG.FORM_ENTRY_IDS.province) || "",
          city: formData.get(CONFIG.FORM_ENTRY_IDS.city) || "",
          neighborhood: formData.get(CONFIG.FORM_ENTRY_IDS.neighborhood) || "",
          status: formData.get(CONFIG.FORM_ENTRY_IDS.status) || "available",
          queueSize: formData.get(CONFIG.FORM_ENTRY_IDS.queueSize) || "none",
          fuelType: formData.get(CONFIG.FORM_ENTRY_IDS.fuelType) || "both",
          notes: formData.get(CONFIG.FORM_ENTRY_IDS.notes) || "",
          confirmations: 0,
          timestamp: new Date().toISOString(),
          lat: null,
          lng: null,
        };
        APP.stations.unshift(tempStation);
        applyFilters();
      }

      setTimeout(closeModal, 2500);
    } else {
      showFormMessage("❌ Erro ao enviar. Verifique a sua ligação.", "error");
    }
  });

  // Guia de configuração
  $("#closeSetupBtn")?.addEventListener("click", () => {
    $("#setupGuide").classList.add("hidden");
    localStorage.setItem("cmz_setup_seen", "1");
  });
}

/* ─────────────────────────────────────────────
   ATUALIZAÇÃO AUTOMÁTICA
───────────────────────────────────────────── */
function startAutoRefresh() {
  APP.refreshTimer = setInterval(() => {
    loadData(false);
  }, CONFIG.REFRESH_INTERVAL);
}

/* ─────────────────────────────────────────────
   INICIALIZAÇÃO
───────────────────────────────────────────── */
async function init() {
  loadConfirmations();
  initMap();
  initEventListeners();
  requestGeolocation();

  // Mostrar guia de configuração na primeira visita
  const seen = localStorage.getItem("cmz_setup_seen");
  if (!seen) {
    setTimeout(() => {
      $("#setupGuide").classList.remove("hidden");
    }, 800);
  }

  await loadData(true);
  startAutoRefresh();
}

// Aguarda DOM pronto
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
