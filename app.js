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
  // URL correta para submissão via POST (endpoint de resposta)
  GOOGLE_FORM_URL:
    "https://docs.google.com/forms/d/e/1FAIpQLSfsvipLk_BZfIVZE21jwSpV1v6HzwfYESNJfDgahYx8c7gkaw/formResponse",

  // URL JSON público da Google Sheet
  SHEETS_JSON_URL:
    "https://docs.google.com/spreadsheets/d/1XOJyN0JXvYdPN-C7xGBaukyXeETWKeOtyo4IAwakToY/gviz/tq?tqx=out:json",

  // Entry IDs reais extraídos do seu link preenchido
  FORM_ENTRY_IDS: {
    timestamp: "entry.504966515",
    province: "entry.667890039", // Província
    city: "entry.850024881", // Cidade
    neighborhood: "entry.454703331", // Bairro
    status: "entry.1638569107", // Status (Ex: Disponivel)
    queueSize: "entry.1904078373", // Fila (Ex: Limpa)
    fuelType: "entry.716807350", // Combustível (Ex: Gasolina)
    notes: "entry.560588685", // ID provável para Observações*
    reportId: "entry.667890039",
    placeId: "entry.850024881",
    name: "entry.454703331",
    address: "entry.1638569107",
    city: "entry.1904078373",
    neighborhood: "entry.716807350",
    lat: "entry.560588685",
    lng: "entry.1214864610",
    fuelType: "entry.1402012265",
    status: "entry.1115978662",
    notes: "entry.804840006",
    confirmation: "entry.2079672422",
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
  GEOCODE_COUNTRY: "Mozambique",
  GEOCODE_MAX_PER_CYCLE: 12,
  GEOCODE_CACHE_KEY: "cmz_geocode_cache",
  PLACES_COUNTRY: "mz",
  PLACES_REGION: "mz",
  PLACES_LANGUAGE: "pt-PT",
  PLACES_TYPES: ["gas_station"],
  PLACES_LOOKUP_ORIGIN: { lat: -25.9653, lng: 32.5892 },
  PLACES_LOOKUP_RESTRICTION: {
    north: -25.78,
    south: -26.08,
    west: 32.43,
    east: 32.75,
  },
  LOOKUP_MIN_QUERY: 2,
  LOOKUP_MAX_RESULTS: 8,

  // Usar dados mock enquanto não configurado
  USE_MOCK: false,
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
  mobileMapVisible: false,
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
  geocodeCache: {},
  geocoder: null,
  placesAutocompleteService: null,
  placesService: null,
  placeSessionToken: null,
  reportLookupItems: [],
  reportLookupIndex: -1,
  reportLookupRequestId: 0,
  reportLookupTimer: null,
  suppressReportFieldSync: false,
};
const STATIONS_CACHE_VERSION = 6;

/* ─────────────────────────────────────────────
   UTILITÁRIOS
───────────────────────────────────────────── */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char] || char,
  );
}

function hasMeaningfulValue(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim() !== "";
  return true;
}

function syncFormEntryNamesFromConfig() {
  const fieldMap = [
    { selector: "#f_timestamp", key: "timestamp" },
    { selector: "#f_report_id", key: "reportId" },
    { selector: "#f_place_id", key: "placeId" },
    { selector: "#f_name", key: "name" },
    { selector: "#f_address", key: "address" },
    { selector: "#f_city", key: "city" },
    { selector: "#f_neighborhood", key: "neighborhood" },
    { selector: "#f_lat", key: "lat" },
    { selector: "#f_lng", key: "lng" },
    { selector: "#f_fuel", key: "fuelType" },
    { selector: "#f_notes", key: "notes" },
    { selector: "#f_confirmation", key: "confirmation" },
  ];

  fieldMap.forEach(({ selector, key }) => {
    const el = $(selector);
    const entryId = CONFIG.FORM_ENTRY_IDS[key];
    if (el && entryId) el.setAttribute("name", entryId);
  });

  $("#f_province")?.closest(".form-group")?.setAttribute("hidden", "hidden");
  $("#f_queue")?.closest(".form-group")?.setAttribute("hidden", "hidden");

  const statusEntryId = CONFIG.FORM_ENTRY_IDS.status;
  if (statusEntryId) {
    $$("#reportForm input[type='radio']").forEach((radio) => {
      radio.setAttribute("name", statusEntryId);
    });
  }
}

function isMobileViewport() {
  return window.matchMedia("(max-width: 900px)").matches;
}

function syncMapToggleButton() {
  const btn = $("#toggleMapBtn");
  if (!btn) return;

  const visible = APP.mobileMapVisible && isMobileViewport();
  const label = visible ? "Ver lista" : "Ver no mapa";
  const icon = visible ? "view_list" : "map";
  btn.innerHTML = `${renderIcon(icon)}<span>${label}</span>`;
  btn.setAttribute("aria-expanded", visible ? "true" : "false");
}

function syncNearChipLabel() {
  const nearChip = $('[data-filter="near"]');
  if (!nearChip) return;
  nearChip.textContent = `Perto de mim (${CONFIG.NEARBY_RADIUS_KM} km)`;
}

function refreshMapAfterLayoutChange() {
  if (!APP.map) return;

  if (APP.mapProvider === "google" && window.google?.maps) {
    google.maps.event.trigger(APP.map, "resize");
  }

  if (APP.mapProvider === "leaflet" && APP.map.invalidateSize) {
    APP.map.invalidateSize();
  }

  focusMapForCurrentFilter(APP.filtered || []);
}

function setMobileMapVisible(visible) {
  const mainLayout = $("#mainLayout");
  if (!mainLayout) return;

  APP.mobileMapVisible = !!visible && isMobileViewport();
  mainLayout.classList.toggle("show-map-mobile", APP.mobileMapVisible);
  syncMapToggleButton();

  if (APP.mobileMapVisible) {
    setTimeout(refreshMapAfterLayoutChange, 120);
  }
}

function handleViewportForMapToggle() {
  const mainLayout = $("#mainLayout");
  if (!mainLayout) return;

  if (!isMobileViewport()) {
    APP.mobileMapVisible = false;
    mainLayout.classList.remove("show-map-mobile");
  }

  syncMapToggleButton();
}

function isValidDateObject(value) {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

function formatReportTimestamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function slugify(value) {
  return normalizeSheetLabel(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildManualPlaceId(parts) {
  const slug = parts.map(slugify).filter(Boolean).join("-");
  return slug ? `manual-${slug}` : "";
}

function fillHiddenReportFields(station = null) {
  const now = new Date();
  const currentPlaceId = String($("#f_place_id")?.value || "").trim();
  const manualPlaceId = buildManualPlaceId([
    $("#f_name")?.value,
    $("#f_city")?.value,
    $("#f_neighborhood")?.value,
  ]);
  const placeId =
    station?.placeId ||
    (currentPlaceId && !currentPlaceId.startsWith("manual-")
      ? currentPlaceId
      : manualPlaceId || currentPlaceId || `manual-${now.getTime()}`);

  const values = {
    "#f_timestamp": formatReportTimestamp(now),
    "#f_report_id": `RPT-${now.getTime()}`,
    "#f_place_id": placeId,
    "#f_lat": station?.lat ?? $("#f_lat")?.value ?? "",
    "#f_lng": station?.lng ?? $("#f_lng")?.value ?? "",
    "#f_confirmation": "Sim",
  };

  Object.entries(values).forEach(([selector, value]) => {
    const el = $(selector);
    if (el) el.value = value ?? "";
  });
}

function parseGvizDateLiteral(value) {
  const match = String(value || "")
    .trim()
    .match(/^Date\(([^)]+)\)$/i);
  if (!match) return null;

  const parts = match[1]
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((part) => !Number.isNaN(part));

  if (!parts.length) return null;

  const [
    year = 0,
    month = 0,
    day = 1,
    hour = 0,
    minute = 0,
    second = 0,
    ms = 0,
  ] = parts;
  const date = new Date(year, month, day, hour, minute, second, ms);
  return isValidDateObject(date) ? date : null;
}

function parseDateValue(value) {
  if (value === null || value === undefined || value === "") return null;

  if (isValidDateObject(value)) return new Date(value.getTime());

  if (typeof value === "number" && Number.isFinite(value)) {
    const asDate = new Date(value);
    if (isValidDateObject(asDate)) return asDate;
  }

  const text = String(value).trim();
  if (!text) return null;

  const gvizDate = parseGvizDateLiteral(text);
  if (gvizDate) return gvizDate;

  // Ignora valor apenas com hora (sem data)
  if (/^\d{1,2}(?::|h)\d{2}(?::\d{2})?$/.test(text)) return null;

  const dmyMatch = text.match(
    /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
  );
  if (dmyMatch) {
    const day = Number(dmyMatch[1]);
    const month = Number(dmyMatch[2]) - 1;
    const yearRaw = Number(dmyMatch[3]);
    const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
    const hour = Number(dmyMatch[4] || 0);
    const minute = Number(dmyMatch[5] || 0);
    const second = Number(dmyMatch[6] || 0);

    const date = new Date(year, month, day, hour, minute, second);
    if (
      isValidDateObject(date) &&
      date.getFullYear() === year &&
      date.getMonth() === month &&
      date.getDate() === day
    ) {
      return date;
    }
  }

  const ymdMatch = text.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
  );
  if (ymdMatch) {
    const year = Number(ymdMatch[1]);
    const month = Number(ymdMatch[2]) - 1;
    const day = Number(ymdMatch[3]);
    const hour = Number(ymdMatch[4] || 0);
    const minute = Number(ymdMatch[5] || 0);
    const second = Number(ymdMatch[6] || 0);
    const date = new Date(year, month, day, hour, minute, second);
    if (
      isValidDateObject(date) &&
      date.getFullYear() === year &&
      date.getMonth() === month &&
      date.getDate() === day
    ) {
      return date;
    }
  }

  const parsed = new Date(text);
  return isValidDateObject(parsed) ? parsed : null;
}

function parseTimeValue(value) {
  if (value === null || value === undefined || value === "") return null;

  if (isValidDateObject(value)) {
    return {
      hours: value.getHours(),
      minutes: value.getMinutes(),
      seconds: value.getSeconds(),
    };
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    // Alguns Sheets retornam hora como fracção do dia (ex: 0.5 = 12:00)
    const dayFraction = Math.abs(value % 1);
    const totalSeconds = Math.round(dayFraction * 24 * 60 * 60);
    return {
      hours: Math.floor(totalSeconds / 3600) % 24,
      minutes: Math.floor((totalSeconds % 3600) / 60),
      seconds: totalSeconds % 60,
    };
  }

  const text = String(value).trim();
  if (!text) return null;

  const gvizDate = parseGvizDateLiteral(text);
  if (gvizDate) {
    return {
      hours: gvizDate.getHours(),
      minutes: gvizDate.getMinutes(),
      seconds: gvizDate.getSeconds(),
    };
  }

  const match = text.match(/(\d{1,2})(?::|h)(\d{2})(?::(\d{2}))?/i);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3] || 0);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    Number.isNaN(seconds) ||
    hours > 23 ||
    minutes > 59 ||
    seconds > 59
  ) {
    return null;
  }

  return { hours, minutes, seconds };
}

function resolveSheetTimestamp({
  timestampValue,
  dateValue,
  timeValue,
  fallbackValue,
}) {
  const direct = parseDateValue(timestampValue);
  if (direct) return direct.toISOString();

  const datePart = parseDateValue(dateValue);
  if (datePart) {
    const timePart = parseTimeValue(timeValue || timestampValue);
    if (timePart) {
      datePart.setHours(timePart.hours, timePart.minutes, timePart.seconds, 0);
    }
    return datePart.toISOString();
  }

  const fallback = parseDateValue(fallbackValue);
  if (fallback) return fallback.toISOString();

  return new Date().toISOString();
}

/** Formata duração em minutos/horas desde timestamp */
function timeAgo(value) {
  const parsedDate = parseDateValue(value);
  if (!parsedDate) return "hora desconhecida";

  const diff = Math.floor((Date.now() - parsedDate.getTime()) / 1000);
  if (diff < 60) return `${diff}s atrás`;
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`;
  return `${Math.floor(diff / 3600)}h atrás`;
}

/** Verifica se o dado é antigo (> STALE_THRESHOLD) */
function isStale(value) {
  const parsedDate = parseDateValue(value);
  if (!parsedDate) return true;
  return Date.now() - parsedDate.getTime() > CONFIG.STALE_THRESHOLD;
}

/** Verifica se é recente (< 30 min) */
function isRecent(value) {
  const parsedDate = parseDateValue(value);
  if (!parsedDate) return false;
  return Date.now() - parsedDate.getTime() < 30 * 60 * 1000;
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

function normalizeStatusValue(value) {
  const normalized = normalizeSheetLabel(value);
  if (!normalized) return "";

  if (["available", "disponivel", "com combustivel"].includes(normalized)) {
    return "available";
  }
  if (["queue", "com fila", "fila"].includes(normalized)) return "queue";
  if (["empty", "sem combustivel", "esgotado"].includes(normalized)) {
    return "empty";
  }
  if (["unknown", "desconhecido", "sem classificacao"].includes(normalized)) {
    return "unknown";
  }
  return "";
}

function normalizeQueueValue(value) {
  const normalized = normalizeSheetLabel(value);
  if (!normalized) return "none";
  if (["none", "sem fila"].includes(normalized)) return "none";
  if (["short", "curta", "fila curta"].includes(normalized)) return "short";
  if (["medium", "media", "fila media"].includes(normalized)) return "medium";
  if (["long", "longa", "fila longa"].includes(normalized)) return "long";
  return "none";
}

function normalizeFuelValue(value) {
  const normalized = normalizeSheetLabel(value);
  if (!normalized) return "both";
  if (["both", "ambos", "gasolina + diesel"].includes(normalized))
    return "both";
  if (["gasoline", "gasolina", "gas"].includes(normalized))
    return "gasoline";
  if (["diesel"].includes(normalized)) return "diesel";
  return "both";
}

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

function getStationLocationText(station, { includeAddress = false } = {}) {
  const parts = [];

  if (includeAddress && station?.address) parts.push(station.address);
  if (station?.neighborhood) parts.push(station.neighborhood);
  if (station?.city) parts.push(station.city);
  if (station?.province) parts.push(station.province);

  return [...new Set(parts.filter(Boolean))].join(" · ");
}

function isMaputoMatolaText(value) {
  const text = normalizeSheetLabel(value);
  return text.includes("maputo") || text.includes("matola");
}

function isMaputoMatolaStation(station) {
  const locationText = [
    station?.name,
    station?.address,
    station?.province,
    station?.city,
    station?.neighborhood,
  ]
    .filter(Boolean)
    .join(" ");

  return isMaputoMatolaText(locationText);
}

function hasCoordinates(station) {
  return (
    Number.isFinite(Number(station?.lat)) &&
    Number.isFinite(Number(station?.lng))
  );
}

function getEffectiveStatus(station) {
  const normalizedStatus = normalizeStatusValue(station.status);
  if (!normalizedStatus || isStale(station.timestamp)) return "unknown";
  return normalizedStatus;
}

function annotateDistances(stations) {
  if (APP.userLat === null || APP.userLng === null) return;
  stations.forEach((station) => {
    if (hasCoordinates(station)) {
      station.distance = haversine(
        APP.userLat,
        APP.userLng,
        Number(station.lat),
        Number(station.lng),
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
    const aTime = parseDateValue(a.timestamp)?.getTime() || 0;
    const bTime = parseDateValue(b.timestamp)?.getTime() || 0;
    return bTime - aTime;
  });
}

function isMaputoStation(station) {
  return isMaputoMatolaStation(station);
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

function loadGeocodeCache() {
  try {
    APP.geocodeCache = JSON.parse(
      localStorage.getItem(CONFIG.GEOCODE_CACHE_KEY) || "{}",
    );
  } catch {
    APP.geocodeCache = {};
  }
}

function saveGeocodeCache() {
  localStorage.setItem(
    CONFIG.GEOCODE_CACHE_KEY,
    JSON.stringify(APP.geocodeCache || {}),
  );
}

function loadCachedStations() {
  try {
    const raw = localStorage.getItem("cmz_stations");
    if (!raw) return null;
    const { data, ts, v } = JSON.parse(raw);
    if (v !== STATIONS_CACHE_VERSION) return null;
    // Cache válido por 5 minutos
    if (Date.now() - ts < 5 * 60 * 1000) return data;
  } catch {}
  return null;
}

function cacheStations(data) {
  localStorage.setItem(
    "cmz_stations",
    JSON.stringify({ data, ts: Date.now(), v: STATIONS_CACHE_VERSION }),
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
    APP.geocoder = new google.maps.Geocoder();
    return;
  }

  if (window.L) {
    APP.mapProvider = "leaflet";
    APP.geocoder = null;
    APP.map = L.map("map", {
      center: [-18.7, 35.3],
      zoom: 5,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org">OpenStreetMap</a> &copy; <a href="https://carto.com">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 19,
      },
    ).addTo(APP.map);

    showToast("Google Maps indisponível. A usar mapa alternativo.");
    return;
  }

  APP.mapProvider = "none";
  APP.geocoder = null;
  const mapEl = document.getElementById("map");
  if (mapEl) {
    mapEl.innerHTML =
      '<div style="padding:16px;color:#f5a623;font-family:Space Mono,monospace">Não foi possível carregar nenhum provedor de mapa.</div>';
  }
}

function getStationGeocodeKey(station) {
  const parts = [
    station?.placeId,
    station?.address,
    station?.name,
    station?.neighborhood,
    station?.city,
    station?.province,
  ]
    .map((part) => normalizeSheetLabel(part))
    .filter(Boolean);

  return parts.join("|");
}

function getStationGeocodeQueries(station) {
  const country = CONFIG.GEOCODE_COUNTRY;
  const options = [
    [station.address, station.city, country].filter(Boolean).join(", "),
    [
      station.name,
      station.address,
      station.neighborhood,
      station.city,
      station.province,
      country,
    ]
      .filter(Boolean)
      .join(", "),
    [station.neighborhood, station.city, station.province, country]
      .filter(Boolean)
      .join(", "),
    [station.city, station.province, country].filter(Boolean).join(", "),
  ];

  return [...new Set(options.filter(Boolean))];
}

function hasRecentFailedGeocode(cacheEntry) {
  if (!cacheEntry?.failed || !cacheEntry?.ts) return false;
  return Date.now() - cacheEntry.ts < 24 * 60 * 60 * 1000;
}

function applyCachedStationCoordinates(station) {
  const key = getStationGeocodeKey(station);
  if (!key) return false;

  const cached = APP.geocodeCache[key];
  if (
    cached &&
    Number.isFinite(Number(cached.lat)) &&
    Number.isFinite(Number(cached.lng))
  ) {
    station.lat = Number(cached.lat);
    station.lng = Number(cached.lng);
    return true;
  }

  return false;
}

function geocodeAddress(address) {
  return new Promise((resolve) => {
    if (!APP.geocoder) {
      resolve(null);
      return;
    }

    APP.geocoder.geocode({ address }, (results, status) => {
      const isOk =
        status === "OK" || status === window.google?.maps?.GeocoderStatus?.OK;
      if (!isOk || !Array.isArray(results) || !results[0]?.geometry?.location) {
        resolve(null);
        return;
      }

      const location = results[0].geometry.location;
      resolve({
        lat: location.lat(),
        lng: location.lng(),
      });
    });
  });
}

async function geocodeStationCoordinates(station) {
  if (hasCoordinates(station)) return false;
  if (APP.mapProvider !== "google" || !window.google?.maps) return false;
  if (!APP.geocoder) APP.geocoder = new google.maps.Geocoder();

  const key = getStationGeocodeKey(station);
  if (!key) return false;

  const cached = APP.geocodeCache[key];
  if (hasRecentFailedGeocode(cached)) return false;

  const queries = getStationGeocodeQueries(station);
  for (const query of queries) {
    const coords = await geocodeAddress(query);
    if (!coords) continue;

    station.lat = coords.lat;
    station.lng = coords.lng;
    APP.geocodeCache[key] = {
      lat: coords.lat,
      lng: coords.lng,
      ts: Date.now(),
      query,
    };
    return true;
  }

  APP.geocodeCache[key] = { failed: true, ts: Date.now() };
  return true;
}

async function hydrateStationCoordinates(stations) {
  if (!Array.isArray(stations) || stations.length === 0) return;

  const missingCoords = [];
  stations.forEach((station) => {
    if (hasCoordinates(station)) return;
    if (applyCachedStationCoordinates(station)) return;
    missingCoords.push(station);
  });

  if (
    missingCoords.length === 0 ||
    APP.mapProvider !== "google" ||
    !window.google?.maps
  ) {
    return;
  }

  const toGeocode = missingCoords.slice(0, CONFIG.GEOCODE_MAX_PER_CYCLE);
  let cacheTouched = false;

  for (const station of toGeocode) {
    const geocoded = await geocodeStationCoordinates(station);
    if (geocoded) cacheTouched = true;
  }

  if (cacheTouched) {
    saveGeocodeCache();
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
  const locationText = getStationLocationText(station, {
    includeAddress: true,
  });
  return `
    <div style="min-width:180px">
      <strong style="font-size:14px;color:${effectiveStatus === "available" ? "#22c55e" : effectiveStatus === "queue" ? "#eab308" : effectiveStatus === "empty" ? "#ef4444" : "#aaa"}">${station.name}</strong><br/>
      <span style="font-size:11px;color:#888">${locationText || "Localizacao nao informada"}</span><br/><br/>
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
    if (!hasCoordinates(s)) return;
    const effectiveStatus = getEffectiveStatus(s);
    const position = { lat: Number(s.lat), lng: Number(s.lng) };

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

    const leafletPosition = [Number(s.lat), Number(s.lng)];
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
  if (!APP.map || !hasCoordinates(station)) return;

  if (APP.mapProvider === "google") {
    APP.map.panTo({ lat: Number(station.lat), lng: Number(station.lng) });
    APP.map.setZoom(14);
    openStationPopup(station.id);
    return;
  }

  APP.map.flyTo([Number(station.lat), Number(station.lng)], 14, {
    duration: 1.2,
  });
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
      if (!hasCoordinates(s)) return;
      const point = { lat: Number(s.lat), lng: Number(s.lng) };
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
    .filter((s) => hasCoordinates(s))
    .map((s) => [Number(s.lat), Number(s.lng)]);

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
    if (stations.some((s) => hasCoordinates(s))) {
      fitMapToStations(stations, { maxZoom: CONFIG.MAPUTO_ZOOM + 1 });
    } else {
      flyTo(
        CONFIG.MAPUTO_CENTER[0],
        CONFIG.MAPUTO_CENTER[1],
        CONFIG.MAPUTO_ZOOM,
      );
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
      const reportLabel =
        effectiveStatus === "unknown" ? "Reportar" : "Editar estado";
      const reportIcon = effectiveStatus === "unknown" ? "report" : "edit";
      const reportButton = `
          <button type="button" class="report-station-btn" data-id="${s.id}" aria-label="${reportLabel} esta bomba">
            ${renderIcon(reportIcon)}<span>${reportLabel}</span>
          </button>`;

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
        ${renderIcon("location_on")} ${getStationLocationText(s) || "Localização não informada"}
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
      if (!station) return;

      if (isMobileViewport() && !APP.mobileMapVisible) {
        setMobileMapVisible(true);
        setTimeout(() => focusStation(station), 150);
        return;
      }

      focusStation(station);
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
    (s) => normalizeStatusValue(s.status) === "available",
  ).length;
  $("#statQueue").textContent = valid.filter(
    (s) => normalizeStatusValue(s.status) === "queue",
  ).length;
  $("#statEmpty").textContent = valid.filter(
    (s) => normalizeStatusValue(s.status) === "empty",
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
        (s.address || "").toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q) ||
        s.neighborhood.toLowerCase().includes(q) ||
        s.province.toLowerCase().includes(q),
    );
  }

  // Filtros de estado
  switch (APP.activeFilter) {
    case "available":
      result = result.filter(
        (s) =>
          normalizeStatusValue(s.status) === "available" &&
          !isStale(s.timestamp),
      );
      break;
    case "no-queue":
      result = result.filter(
        (s) =>
          normalizeStatusValue(s.status) === "available" &&
          !!s.queueSize &&
          normalizeQueueValue(s.queueSize) === "none" &&
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
              hasCoordinates(s) &&
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
    async (pos) => {
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

      if (APP.activeFilter === "near") {
        await hydrateStationCoordinates(APP.stations);
      }

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

function normalizeSheetLabel(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function buildSheetColumnIndex(columns) {
  const index = {};
  const rules = [
    {
      key: "reportTimestamp",
      patterns: [
        /^timetamps?$/,
        /^report.*timestamp$/,
        /^timestamp.*report$/,
        /^hora.*reporte$/,
      ],
    },
    {
      key: "timestamp",
      patterns: [
        /^timestamp$/,
        /^timestamp\b/,
        /carimbo/,
        /data.*hora/,
        /hora.*data/,
      ],
    },
    { key: "reportId", patterns: [/report.*id/, /report_id/] },
    { key: "placeId", patterns: [/place.*id/, /place_id/] },
    {
      key: "date",
      patterns: [/^data$/, /data.*alteracao/, /data.*atualizacao/],
    },
    {
      key: "time",
      patterns: [/^hora$/, /hora.*alteracao/, /hora.*atualizacao/],
    },
    {
      key: "name",
      patterns: [
        /posto.*nome/,
        /posto_nome/,
        /nome.*posto/,
        /nome.*bomba/,
        /^nome$/,
      ],
    },
    { key: "address", patterns: [/endereco/, /morada/, /localizacao/] },
    { key: "province", patterns: [/provincia/] },
    { key: "city", patterns: [/cidade/] },
    { key: "neighborhood", patterns: [/bairro/, /zona/] },
    { key: "status", patterns: [/estado/, /status/, /situacao/, /disponibil/] },
    { key: "queueSize", patterns: [/fila/, /queue/, /espera/] },
    {
      key: "confirmations",
      patterns: [
        /confirma/,
        /contador.*confirm/,
        /confirmacoes?/,
        /confirmacao/,
        /votos/,
      ],
    },
    { key: "fuelType", patterns: [/combustivel/, /fuel/] },
    { key: "notes", patterns: [/observa/, /observacao/, /nota/, /coment/] },
    { key: "lat", patterns: [/^lat$/, /latitude/] },
    { key: "lng", patterns: [/^lng$/, /longitude/, /long/] },
  ];

  (columns || []).forEach((col, i) => {
    const label = normalizeSheetLabel(col?.label || col?.id || "");
    if (!label) return;

    rules.forEach(({ key, patterns }) => {
      if (index[key] !== undefined) return;
      if (patterns.some((re) => re.test(label))) {
        index[key] = i;
      }
    });
  });

  return index;
}

function resolveStationTimestampSources({ primaryValue, secondaryValue, fallbackValue }) {
  const primary = parseDateValue(primaryValue);
  if (primary) return primary.toISOString();

  const secondary = parseDateValue(secondaryValue);
  if (secondary) return secondary.toISOString();

  const fallback = parseDateValue(fallbackValue);
  if (fallback) return fallback.toISOString();

  return new Date().toISOString();
}

function parseCoordinate(value) {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(String(value).replace(",", "."));
  return Number.isFinite(num) ? num : null;
}

function parseConfirmations(value, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;

  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.trunc(value));
  }

  const text = String(value).trim();
  if (!text) return fallback;

  // Aceita "12", "12 confirmações", "12.0", "12,0"
  if (["sim", "yes", "true", "confirmado"].includes(normalizeSheetLabel(text))) {
    return 1;
  }

  const match = text.match(/-?\d+(?:[.,]\d+)?/);
  if (!match) return fallback;

  const parsed = Number(match[0].replace(",", "."));
  if (!Number.isFinite(parsed)) return fallback;

  return Math.max(0, Math.trunc(parsed));
}

/** Converte linha da Google Sheets para objeto station */
function sheetsRowToStation(row, index, colIndex = {}) {
  const cols = row.c || [];
  const getCellByIndex = (i) =>
    typeof i === "number" ? cols[i] || null : null;
  const cellToText = (cell) => {
    if (!cell) return "";
    if (cell.f != null && String(cell.f).trim()) return String(cell.f).trim();
    if (cell.v == null) return "";
    return String(cell.v).trim();
  };
  const getRawByIndex = (i) => getCellByIndex(i)?.v ?? null;
  const getTextByIndex = (i) => cellToText(getCellByIndex(i));
  const getRawByCandidates = (candidates = []) => {
    for (const candidate of candidates) {
      const value = getRawByIndex(candidate);
      if (hasMeaningfulValue(value)) return value;
    }
    return null;
  };
  const getTextByCandidates = (candidates = []) => {
    for (const candidate of candidates) {
      const value = getTextByIndex(candidate);
      if (hasMeaningfulValue(value)) return value;
    }
    return "";
  };
  const getRawByKey = (key) => getRawByIndex(colIndex[key]);
  const getTextByKey = (key) => getTextByIndex(colIndex[key]);

  // fallback por posição mantém compatibilidade com formulários antigos
  const timestamp = getRawByKey("reportTimestamp")
    ? resolveStationTimestampSources({
        primaryValue: getRawByKey("reportTimestamp"),
        secondaryValue: getRawByKey("timestamp"),
        fallbackValue: getRawByCandidates([1, 0]),
      })
    : resolveSheetTimestamp({
        timestampValue: getRawByKey("timestamp"),
        dateValue: getRawByKey("date"),
        timeValue: getRawByKey("time"),
        fallbackValue: getRawByCandidates([1, 0]),
      });

  const reportId = getTextByKey("reportId") || getTextByCandidates([2, 1]) || "";
  const placeId = getTextByKey("placeId") || getTextByCandidates([3, 2]) || "";
  const name =
    getTextByKey("name") || getTextByCandidates([4, 3]) || "Bomba sem nome";
  const address = getTextByKey("address") || getTextByCandidates([5, 4]) || "";
  const province = getTextByKey("province") || "";
  const city = getTextByKey("city") || getTextByCandidates([6, 5]) || "";
  const neighborhood =
    getTextByKey("neighborhood") || getTextByCandidates([7, 6]) || "";
  const status = normalizeStatusValue(
    getTextByKey("status") || getTextByCandidates([11, 10]) || "",
  );
  const queueText = getTextByKey("queueSize") || getTextByCandidates([12]);
  const queueSize = queueText ? normalizeQueueValue(queueText) : "";
  const confirmations = parseConfirmations(
    getRawByKey("confirmations") ??
      getTextByKey("confirmations") ??
      getTextByCandidates([13, 12]),
    0,
  );
  const fuelType = normalizeFuelValue(
    getTextByKey("fuelType") || getTextByCandidates([10, 9]) || "both",
  );
  const notes = getTextByKey("notes") || getTextByCandidates([12, 11]) || "";
  const lat = parseCoordinate(getRawByKey("lat") ?? getRawByCandidates([8, 7]));
  const lng = parseCoordinate(getRawByKey("lng") ?? getRawByCandidates([9, 8]));

  return {
    id: placeId || reportId || `sheet_${index}`,
    reportId,
    placeId,
    timestamp,
    name,
    address,
    province,
    city,
    neighborhood,
    status,
    queueSize,
    confirmations,
    fuelType,
    notes,
    lat,
    lng,
  };
}

function getStationGroupKey(station, index = 0) {
  const placeId = normalizeSheetLabel(station?.placeId);
  if (placeId && !placeId.startsWith("manual-")) return `place:${placeId}`;

  const manualLocationKey = [
    station?.address,
    station?.city,
    station?.neighborhood,
  ]
    .map((part) => normalizeSheetLabel(part))
    .filter(Boolean)
    .join("|");
  if (manualLocationKey) return `manual:${manualLocationKey}`;

  const manualKey = [
    station?.name,
    station?.city,
    station?.neighborhood,
  ]
    .map((part) => normalizeSheetLabel(part))
    .filter(Boolean)
    .join("|");
  if (manualKey) return `manual:${manualKey}`;

  if (placeId) return `place:${placeId}`;

  const reportId = normalizeSheetLabel(station?.reportId);
  if (reportId) return `report:${reportId}`;

  return `row:${index}`;
}

function getStationTimestampMs(station) {
  const parsed = parseDateValue(station?.timestamp);
  return parsed ? parsed.getTime() : 0;
}

function pickFirstReportValue(reports, selector, fallback = "") {
  for (const report of reports) {
    const value = selector(report);
    if (hasMeaningfulValue(value)) return value;
  }
  return fallback;
}

function consolidateStationReports(stations) {
  const groups = new Map();

  (stations || []).forEach((station, index) => {
    const key = getStationGroupKey(station, index);
    const bucket = groups.get(key) || [];
    bucket.push(station);
    groups.set(key, bucket);
  });

  return [...groups.values()]
    .map((reports) => {
      const sorted = [...reports].sort(
        (a, b) => getStationTimestampMs(b) - getStationTimestampMs(a),
      );
      const freshest = sorted[0];
      const freshestWithStatus =
        sorted.find(
          (report) =>
            !isStale(report.timestamp) && normalizeStatusValue(report.status),
        ) ||
        sorted.find((report) => normalizeStatusValue(report.status)) ||
        freshest;
      const placeId = pickFirstReportValue(sorted, (report) => report.placeId, "");
      const reportId = pickFirstReportValue(
        sorted,
        (report) => report.reportId,
        freshest?.reportId || "",
      );

      return {
        id: placeId || reportId || freshest?.id || `sheet_${Date.now()}`,
        reportId,
        placeId,
        timestamp: freshestWithStatus?.timestamp || freshest?.timestamp || "",
        lastReportTimestamp: freshest?.timestamp || "",
        name: pickFirstReportValue(
          sorted,
          (report) => report.name,
          "Bomba sem nome",
        ),
        address: pickFirstReportValue(sorted, (report) => report.address, ""),
        province: pickFirstReportValue(sorted, (report) => report.province, ""),
        city: pickFirstReportValue(sorted, (report) => report.city, ""),
        neighborhood: pickFirstReportValue(
          sorted,
          (report) => report.neighborhood,
          "",
        ),
        status: normalizeStatusValue(freshestWithStatus?.status) || "",
        queueSize: pickFirstReportValue(sorted, (report) => report.queueSize, ""),
        confirmations: sorted.reduce(
          (sum, report) => sum + parseConfirmations(report.confirmations, 0),
          0,
        ),
        fuelType: normalizeFuelValue(
          pickFirstReportValue(sorted, (report) => report.fuelType, "both"),
        ),
        notes: pickFirstReportValue(sorted, (report) => report.notes, ""),
        lat: pickFirstReportValue(sorted, (report) => report.lat, null),
        lng: pickFirstReportValue(sorted, (report) => report.lng, null),
        reports: sorted.length,
      };
    })
    .sort((a, b) => getStationTimestampMs(b) - getStationTimestampMs(a));
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
    const table = json.table || {};
    const rows = table.rows || [];
    const colIndex = buildSheetColumnIndex(table.cols || []);

    return consolidateStationReports(
      rows.map((row, i) => sheetsRowToStation(row, i, colIndex)),
    );
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
    }
  }

  // Fallback para dados mock
  if (!stations || stations.length === 0) {
    stations = MOCK_STATIONS;
  }

  await hydrateStationCoordinates(stations);

  if (!CONFIG.USE_MOCK && stations?.length) {
    cacheStations(stations);
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

function buildSubmittedStationFromFormData(formData) {
  const placeId =
    formData.get(CONFIG.FORM_ENTRY_IDS.placeId) || `temp_${Date.now()}`;
  const city = formData.get(CONFIG.FORM_ENTRY_IDS.city) || "";
  const address = formData.get(CONFIG.FORM_ENTRY_IDS.address) || "";
  const neighborhood = formData.get(CONFIG.FORM_ENTRY_IDS.neighborhood) || "";
  const province = isMaputoMatolaText(`${city} ${address}`)
    ? normalizeSheetLabel(city).includes("matola")
      ? "Maputo Província"
      : "Maputo Cidade"
    : "";

  return {
    id: placeId,
    reportId: formData.get(CONFIG.FORM_ENTRY_IDS.reportId) || "",
    placeId,
    name: formData.get(CONFIG.FORM_ENTRY_IDS.name) || "Nova bomba",
    address,
    province,
    city,
    neighborhood,
    status:
      normalizeStatusValue(formData.get(CONFIG.FORM_ENTRY_IDS.status)) ||
      "available",
    queueSize: "",
    fuelType:
      normalizeFuelValue(formData.get(CONFIG.FORM_ENTRY_IDS.fuelType)) || "both",
    notes: formData.get(CONFIG.FORM_ENTRY_IDS.notes) || "",
    confirmations: parseConfirmations(
      formData.get(CONFIG.FORM_ENTRY_IDS.confirmation),
      0,
    ),
    timestamp:
      formData.get(CONFIG.FORM_ENTRY_IDS.timestamp) ||
      new Date().toISOString(),
    lat: parseCoordinate(formData.get(CONFIG.FORM_ENTRY_IDS.lat)),
    lng: parseCoordinate(formData.get(CONFIG.FORM_ENTRY_IDS.lng)),
  };
}

/* ─────────────────────────────────────────────
   MODAL DO FORMULÁRIO
───────────────────────────────────────────── */
function withSuppressedReportFieldSync(callback) {
  APP.suppressReportFieldSync = true;
  try {
    callback();
  } finally {
    APP.suppressReportFieldSync = false;
  }
}

function setReportStatusRadios(statusValue = "") {
  const radioValue =
    statusValue === "available"
      ? "Disponivel"
      : statusValue === "queue"
        ? "Com fila"
        : statusValue === "empty"
          ? "Sem combustivel"
          : "";

  $$("#reportForm input[type='radio']").forEach((radio) => {
    radio.checked = radio.value === radioValue;
    radio.closest(".radio-opt")?.classList.remove("error-radio");
  });
}

function clearResolvedReportLocation() {
  ["#f_place_id", "#f_lat", "#f_lng"].forEach((selector) => {
    const field = $(selector);
    if (field) field.value = "";
  });
}

function buildReportLookupValue(station) {
  return station?.name || station?.address || "";
}

function applyStationToReportForm(
  station,
  { fillStatus = true, fillFuel = true, fillNotes = true, syncLookup = true } = {},
) {
  if (!station) return;

  withSuppressedReportFieldSync(() => {
    if (syncLookup) {
      const lookup = $("#f_station_lookup");
      if (lookup) lookup.value = buildReportLookupValue(station);
    }

    if (hasMeaningfulValue(station.name)) $("#f_name").value = station.name;
    if (hasMeaningfulValue(station.address)) $("#f_address").value = station.address;
    if (hasMeaningfulValue(station.city)) $("#f_city").value = station.city;
    if (hasMeaningfulValue(station.neighborhood)) {
      $("#f_neighborhood").value = station.neighborhood;
    }
    if (fillFuel && hasMeaningfulValue(station.fuelType)) {
      $("#f_fuel").value = normalizeFuelValue(station.fuelType);
    }
    if (fillNotes && hasMeaningfulValue(station.notes)) {
      $("#f_notes").value = station.notes;
    }
    if (fillStatus) {
      setReportStatusRadios(normalizeStatusValue(station.status));
    }

    const placeIdField = $("#f_place_id");
    const latField = $("#f_lat");
    const lngField = $("#f_lng");
    if (placeIdField) placeIdField.value = station.placeId || "";
    if (latField) latField.value = hasMeaningfulValue(station.lat) ? station.lat : "";
    if (lngField) lngField.value = hasMeaningfulValue(station.lng) ? station.lng : "";

    fillHiddenReportFields(station);
  });
}

function hideReportLookupDropdown() {
  const dropdown = $("#stationLookupDropdown");
  const input = $("#f_station_lookup");
  clearTimeout(APP.reportLookupTimer);
  if (dropdown) {
    dropdown.classList.add("hidden");
    dropdown.innerHTML = "";
  }
  if (input) input.setAttribute("aria-expanded", "false");
  APP.reportLookupItems = [];
  APP.reportLookupIndex = -1;
}

function setReportLookupActiveIndex(index) {
  const options = $$("#stationLookupDropdown .lookup-option");
  if (!options.length) {
    APP.reportLookupIndex = -1;
    return;
  }

  APP.reportLookupIndex = Math.max(0, Math.min(index, options.length - 1));
  options.forEach((option, optionIndex) => {
    option.classList.toggle("active", optionIndex === APP.reportLookupIndex);
  });
}

function renderReportLookupItems(items) {
  const dropdown = $("#stationLookupDropdown");
  const input = $("#f_station_lookup");
  if (!dropdown || !input) return;

  APP.reportLookupItems = items;
  if (!items.length) {
    hideReportLookupDropdown();
    return;
  }

  dropdown.innerHTML = items
    .map(
      (item, index) => `
        <button
          type="button"
          class="lookup-option"
          data-index="${index}"
          role="option"
        >
          <span class="lookup-copy">
            <span class="lookup-title">${escapeHtml(item.title)}</span>
            <span class="lookup-subtitle">${escapeHtml(item.subtitle)}</span>
          </span>
          <span class="lookup-tag">${escapeHtml(item.meta)}</span>
        </button>`,
    )
    .join("");

  dropdown.classList.remove("hidden");
  input.setAttribute("aria-expanded", "true");
  setReportLookupActiveIndex(0);

  $$("#stationLookupDropdown .lookup-option").forEach((button) => {
    button.addEventListener("mousedown", (event) => {
      event.preventDefault();
      void selectReportLookupItem(Number(button.dataset.index));
    });
  });
}

function getLookupScore(station, query) {
  const haystacks = [
    station?.name,
    station?.address,
    station?.city,
    station?.neighborhood,
  ].map((value) => normalizeSheetLabel(value));

  let score = 0;
  haystacks.forEach((value, index) => {
    if (!value) return;
    if (value.startsWith(query)) score += index === 0 ? 60 : 35;
    else if (value.includes(query)) score += index === 0 ? 20 : 10;
  });

  return score;
}

function getLocalLookupItems(query) {
  const normalizedQuery = normalizeSheetLabel(query);
  if (normalizedQuery.length < CONFIG.LOOKUP_MIN_QUERY) return [];

  return [...APP.stations]
    .filter(isMaputoMatolaStation)
    .map((station) => ({
      station,
      score: getLookupScore(station, normalizedQuery),
    }))
    .filter(({ score }) => score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        getStationTimestampMs(b.station) - getStationTimestampMs(a.station),
    )
    .slice(0, CONFIG.LOOKUP_MAX_RESULTS)
    .map(({ station }) => ({
      key: `local:${station.id}`,
      source: "local",
      station,
      title: station.name || station.address || "Bomba sem nome",
      subtitle:
        getStationLocationText(station, { includeAddress: true }) ||
        "Bomba já reportada",
      meta: STATUS_OPTIONS[getEffectiveStatus(station)]?.label || "Sem classificação",
    }));
}

function canUsePlacesLookup() {
  return !!window.google?.maps?.places && APP.mapProvider === "google";
}

function ensurePlacesLookupServices() {
  if (!canUsePlacesLookup()) return false;

  if (!APP.placesAutocompleteService) {
    APP.placesAutocompleteService = new google.maps.places.AutocompleteService();
  }

  if (!APP.placesService) {
    APP.placesService = new google.maps.places.PlacesService(
      APP.map || document.createElement("div"),
    );
  }

  if (
    !APP.placeSessionToken &&
    window.google?.maps?.places?.AutocompleteSessionToken
  ) {
    APP.placeSessionToken = new google.maps.places.AutocompleteSessionToken();
  }

  return true;
}

function fetchGoogleLookupItems(query) {
  return new Promise((resolve) => {
    if (
      !ensurePlacesLookupServices() ||
      normalizeSheetLabel(query).length < CONFIG.LOOKUP_MIN_QUERY
    ) {
      resolve([]);
      return;
    }

    const request = {
      input: query,
      componentRestrictions: { country: CONFIG.PLACES_COUNTRY },
      region: CONFIG.PLACES_REGION,
      language: CONFIG.PLACES_LANGUAGE,
      origin: CONFIG.PLACES_LOOKUP_ORIGIN,
      locationRestriction: CONFIG.PLACES_LOOKUP_RESTRICTION,
      types: CONFIG.PLACES_TYPES,
    };
    if (APP.placeSessionToken) request.sessionToken = APP.placeSessionToken;

    APP.placesAutocompleteService.getPlacePredictions(
      request,
      (predictions, status) => {
        const ok =
          status === "OK" ||
          status === window.google?.maps?.places?.PlacesServiceStatus?.OK;
        if (!ok || !Array.isArray(predictions)) {
          resolve([]);
          return;
        }

        resolve(
          predictions
            .filter((prediction) =>
              isMaputoMatolaText(
                prediction.structured_formatting?.secondary_text ||
                  prediction.description,
              ),
            )
            .slice(0, CONFIG.LOOKUP_MAX_RESULTS)
            .map((prediction) => ({
              key: `google:${prediction.place_id}`,
              source: "google",
              placeId: prediction.place_id,
              title:
                prediction.structured_formatting?.main_text ||
                prediction.description,
              subtitle:
                prediction.structured_formatting?.secondary_text ||
                prediction.description,
              meta: "Google Maps",
            })),
        );
      },
    );
  });
}

function getPlaceComponent(place, types) {
  return (
    place?.address_components?.find((component) =>
      types.some((type) => component.types?.includes(type)),
    )?.long_name || ""
  );
}

function buildStationFromGooglePlace(place) {
  const location = place?.geometry?.location;

  return {
    id: place?.place_id || `google-${Date.now()}`,
    placeId: place?.place_id || "",
    name:
      place?.name ||
      place?.formatted_address?.split(",")[0] ||
      "Bomba sem nome",
    address: place?.formatted_address || "",
    province: getPlaceComponent(place, ["administrative_area_level_1"]),
    city:
      getPlaceComponent(place, [
        "locality",
        "administrative_area_level_2",
        "administrative_area_level_1",
      ]) || "",
    neighborhood:
      getPlaceComponent(place, [
        "neighborhood",
        "sublocality",
        "sublocality_level_1",
      ]) || "",
    lat: typeof location?.lat === "function" ? location.lat() : null,
    lng: typeof location?.lng === "function" ? location.lng() : null,
    status: "",
    fuelType: "",
    notes: "",
  };
}

function isAllowedGooglePlace(place) {
  const types = Array.isArray(place?.types) ? place.types : [];
  const locationText = [
    place?.name,
    place?.formatted_address,
    getPlaceComponent(place, ["administrative_area_level_1"]),
    getPlaceComponent(place, ["locality", "administrative_area_level_2"]),
  ]
    .filter(Boolean)
    .join(" ");

  const looksLikeAllowedArea = isMaputoMatolaText(locationText);
  const looksLikeFuelStation =
    types.length === 0 || types.includes("gas_station");

  return looksLikeAllowedArea && looksLikeFuelStation;
}

function fetchGooglePlaceDetails(placeId) {
  return new Promise((resolve) => {
    if (!ensurePlacesLookupServices() || !placeId) {
      resolve(null);
      return;
    }

    APP.placesService.getDetails(
      {
        placeId,
        fields: [
          "place_id",
          "name",
          "formatted_address",
          "geometry",
          "address_components",
          "types",
        ],
        sessionToken: APP.placeSessionToken || undefined,
      },
      (place, status) => {
        const ok =
          status === "OK" ||
          status === window.google?.maps?.places?.PlacesServiceStatus?.OK;
        resolve(ok && place ? place : null);
      },
    );
  });
}

async function selectReportLookupItem(index) {
  const item = APP.reportLookupItems[index];
  hideReportLookupDropdown();
  if (!item) return;

  if (item.source === "local" && item.station) {
    applyStationToReportForm(item.station);
    return;
  }

  if (item.source === "google" && item.placeId) {
    const place = await fetchGooglePlaceDetails(item.placeId);
    if (!place) {
      showToast("Não foi possível carregar os detalhes deste local.");
      return;
    }
    if (!isAllowedGooglePlace(place)) {
      showToast("Selecione apenas bombas de combustível em Maputo ou Matola.");
      return;
    }

    clearResolvedReportLocation();
    applyStationToReportForm(buildStationFromGooglePlace(place), {
      fillStatus: false,
      fillFuel: false,
      fillNotes: false,
    });
    APP.placeSessionToken = null;
  }
}

async function refreshReportLookup(query) {
  const normalizedQuery = normalizeSheetLabel(query);
  const requestId = ++APP.reportLookupRequestId;

  if (normalizedQuery.length < CONFIG.LOOKUP_MIN_QUERY) {
    hideReportLookupDropdown();
    return;
  }

  const localItems = getLocalLookupItems(query);
  const googleItems = await fetchGoogleLookupItems(query);
  if (requestId !== APP.reportLookupRequestId) return;

  const seen = new Set(
    localItems.map((item) =>
      normalizeSheetLabel(`${item.title}|${item.subtitle}`),
    ),
  );
  const merged = [...localItems];

  googleItems.forEach((item) => {
    const fingerprint = normalizeSheetLabel(`${item.title}|${item.subtitle}`);
    if (seen.has(fingerprint)) return;
    seen.add(fingerprint);
    merged.push(item);
  });

  renderReportLookupItems(merged.slice(0, CONFIG.LOOKUP_MAX_RESULTS));
}

function moveReportLookupSelection(direction) {
  if (!APP.reportLookupItems.length) return;

  const nextIndex =
    APP.reportLookupIndex < 0
      ? 0
      : (APP.reportLookupIndex + direction + APP.reportLookupItems.length) %
        APP.reportLookupItems.length;
  setReportLookupActiveIndex(nextIndex);
}

function openModal({ keepHint = false } = {}) {
  if (!keepHint) $("#reportStationHint").classList.add("hidden");
  $("#reportModal").classList.remove("hidden");
  document.body.style.overflow = "hidden";
  if (!keepHint) APP.placeSessionToken = null;
  if (!keepHint) fillHiddenReportFields();
  setTimeout(() => ($("#f_station_lookup") || $("#f_name"))?.focus(), 100);
}

function openReportForStation(station) {
  const hint = $("#reportStationHint");
  const staleOrUnknown =
    isStale(station.timestamp) || getEffectiveStatus(station) === "unknown";
  hint.classList.remove("hidden");
  hint.textContent = staleOrUnknown
    ? `${station.name} não tem classificação recente. Atualize o estado atual.`
    : `Atualizar estado de ${station.name}. Os dados atuais já foram preenchidos.`;

  applyStationToReportForm(station);

  openModal({ keepHint: true });
}

function closeModal() {
  $("#reportModal").classList.add("hidden");
  document.body.style.overflow = "";
  $("#reportForm").reset();
  hideReportLookupDropdown();
  APP.placeSessionToken = null;
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
    if (e.key !== "Escape") return;
    if (APP.reportLookupItems.length) {
      hideReportLookupDropdown();
      return;
    }
    if (!$("#reportModal").classList.contains("hidden")) closeModal();
  });

  const lookupInput = $("#f_station_lookup");
  lookupInput?.addEventListener("input", (e) => {
    if (APP.suppressReportFieldSync) return;
    clearResolvedReportLocation();
    const query = e.target.value.trim();
    clearTimeout(APP.reportLookupTimer);
    APP.reportLookupTimer = setTimeout(() => {
      void refreshReportLookup(query);
    }, 180);
  });
  lookupInput?.addEventListener("focus", (e) => {
    const query = e.target.value.trim();
    if (query.length >= CONFIG.LOOKUP_MIN_QUERY) {
      void refreshReportLookup(query);
    }
  });
  lookupInput?.addEventListener("blur", () => {
    setTimeout(hideReportLookupDropdown, 120);
  });
  lookupInput?.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveReportLookupSelection(1);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      moveReportLookupSelection(-1);
      return;
    }
    if (e.key === "Enter" && APP.reportLookupItems.length) {
      e.preventDefault();
      void selectReportLookupItem(
        APP.reportLookupIndex >= 0 ? APP.reportLookupIndex : 0,
      );
      return;
    }
    if (e.key === "Escape") {
      hideReportLookupDropdown();
    }
  });

  ["#f_name", "#f_address", "#f_city", "#f_neighborhood"].forEach((selector) => {
    $(selector)?.addEventListener("input", () => {
      if (APP.suppressReportFieldSync) return;
      clearResolvedReportLocation();
    });
  });

  $$("#reportForm input[type='radio']").forEach((radio) => {
    radio.addEventListener("change", () => {
      radio.closest(".radio-opt")?.classList.remove("error-radio");
    });
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".lookup-shell")) {
      hideReportLookupDropdown();
    }
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

  // Toggle do mapa no mobile
  $("#toggleMapBtn")?.addEventListener("click", () => {
    setMobileMapVisible(!APP.mobileMapVisible);
  });

  window.addEventListener("resize", () => {
    const wasMobileMapVisible = APP.mobileMapVisible;
    handleViewportForMapToggle();

    if (!isMobileViewport() || wasMobileMapVisible) {
      setTimeout(refreshMapAfterLayoutChange, 120);
    }
  });

  // Chips de filtro
  $$(".chip").forEach((chip) => {
    chip.addEventListener("click", async () => {
      $$(".chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      APP.activeFilter = chip.dataset.filter;

      if (APP.activeFilter === "near" && APP.userLat === null) {
        requestGeolocation();
        showToast("📍 A detectar localização…");
        return;
      }

      if (APP.activeFilter === "near") {
        await hydrateStationCoordinates(APP.stations);
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

    fillHiddenReportFields();
    const formData = new FormData(form);
    const result = await submitReport(formData);

    submitBtn.textContent = "Enviar Reporte";
    submitBtn.disabled = false;

    if (result.success) {
      const mockNote = result.mock
        ? " (modo demo — configure o Google Forms para envio real)"
        : "";
      showFormMessage(`✅ Reporte enviado com sucesso!${mockNote}`, "success");
      const tempStation = buildSubmittedStationFromFormData(formData);
      APP.stations = consolidateStationReports([tempStation, ...APP.stations]);
      await hydrateStationCoordinates(APP.stations);
      cacheStations(APP.stations);
      applyFilters();
      form.reset();

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
  loadGeocodeCache();
  initMap();
  syncFormEntryNamesFromConfig();
  syncNearChipLabel();
  initEventListeners();
  handleViewportForMapToggle();
  setMobileMapVisible(false);
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
