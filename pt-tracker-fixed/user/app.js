import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./firebase.js";
import { checkAlerts } from "./alert.js"; // FIX: was "./alerts.js" (wrong filename)

let map;
let buses = [];
let selectedBus = null;
const busMarkers = {};

function createBusIcon() {
  return L.divIcon({
    html: `<div class="bus-icon-static">🚌</div>`, // FIX: was missing backticks (JSX-like syntax)
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
}

function getAvailability(bus) {
  const available = Number(bus.availableSeats ?? 0);
  if (available === 0) return "Full";
  if (available <= 8) return "Few Seats";
  return "Available";
}

function getPopupHtml(bus) {
  return `
    <div style="min-width:170px">
      <b>${bus.bus_id}</b><br>
      Route: ${bus.routeName || "-"}<br>
      ETA: ${bus.etaMinutes ?? "-"} min<br>
      Delay: ${bus.delayMinutes ?? 0} min<br>
      Seats: ${bus.availableSeats ?? 0}
    </div>
  `;
}

function applyTheme() {
  const saved = localStorage.getItem("theme") || "light";
  const button = document.getElementById("themeToggle");
  if (saved === "dark") {
    document.documentElement.classList.add("dark");
    button.textContent = "☀️ Light";
  } else {
    document.documentElement.classList.remove("dark");
    button.textContent = "🌙 Dark";
  }
}

function toggleTheme() {
  const isDark = document.documentElement.classList.contains("dark");
  localStorage.setItem("theme", isDark ? "light" : "dark");
  applyTheme();
}

function initMap() {
  map = L.map("map").setView([13.0827, 80.2707], 12);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);
}

function updateMarker(bus) {
  const lat = Number(bus.latitude);
  const lng = Number(bus.longitude);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return;

  if (!busMarkers[bus.bus_id]) {
    const marker = L.marker([lat, lng], { icon: createBusIcon() }).addTo(map);
    marker.bindPopup(getPopupHtml(bus));
    marker.on("click", () => {
      selectedBus = bus;
      showBusDetails(bus);
      renderBusList();
    });
    busMarkers[bus.bus_id] = marker;
  } else {
    busMarkers[bus.bus_id].setLatLng([lat, lng]);
    busMarkers[bus.bus_id].bindPopup(getPopupHtml(bus));
  }
}

function getFilteredBuses() {
  const search = document.getElementById("searchInput").value.toLowerCase();
  const availability = document.getElementById("availabilityFilter").value;
  return buses.filter(bus => {
    const matchesSearch =
      (bus.bus_id || "").toLowerCase().includes(search) ||
      (bus.routeName || "").toLowerCase().includes(search);
    const busAvailability = getAvailability(bus);
    const matchesAvailability = availability === "All" || availability === busAvailability;
    return matchesSearch && matchesAvailability;
  });
}

function renderBusList() {
  const list = document.getElementById("busList");
  const filtered = getFilteredBuses();
  document.getElementById("busCount").textContent = `${filtered.length} buses`; // FIX: was missing backticks
  list.innerHTML = "";

  if (!filtered.length) {
    list.innerHTML = `<div class="bg-gray-100 dark:bg-gray-700 rounded-2xl p-4 text-center">No buses found</div>`; // FIX: missing backticks
    return;
  }

  filtered.forEach(bus => {
    const availability = getAvailability(bus);
    const availabilityClass =
      availability === "Available" ? "text-green-600"
      : availability === "Few Seats" ? "text-yellow-500"
      : "text-red-500";

    const activeClass = selectedBus && selectedBus.bus_id === bus.bus_id ? "active" : "";
    const card = document.createElement("div");
    card.className = `bus-card ${activeClass} bg-gray-50 dark:bg-gray-700 rounded-2xl p-4 shadow cursor-pointer`; // FIX: was missing backticks

    card.innerHTML = `
      <div class="flex justify-between items-start">
        <div>
          <h3 class="font-bold text-lg">${bus.bus_id}</h3>
          <p class="text-sm text-gray-600 dark:text-gray-300 mt-1">${bus.routeName || "-"}</p>
        </div>
        <div class="text-right">
          <div class="font-bold text-blue-600 dark:text-blue-400">${bus.etaMinutes ?? "-"} min</div>
          <div class="text-xs text-gray-500 dark:text-gray-300">ETA</div>
        </div>
      </div>
      <div class="grid grid-cols-3 gap-2 mt-4 text-sm">
        <div class="bg-white dark:bg-gray-800 rounded-xl p-2 text-center">
          <div class="font-semibold">${bus.delayMinutes ?? 0}</div>
          <div class="text-xs text-gray-500">Delay</div>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-xl p-2 text-center">
          <div class="font-semibold">${bus.availableSeats ?? 0}</div>
          <div class="text-xs text-gray-500">Seats</div>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-xl p-2 text-center">
          <div class="font-semibold ${availabilityClass}">${availability}</div>
          <div class="text-xs text-gray-500">Status</div>
        </div>
      </div>
    `;

    card.onclick = () => {
      selectedBus = bus;
      showBusDetails(bus);
      const marker = busMarkers[bus.bus_id];
      if (marker) {
        map.setView(marker.getLatLng(), 13);
        marker.openPopup();
      }
      renderBusList();
    };

    list.appendChild(card);
  });
}

function showBusDetails(bus) {
  const availability = getAvailability(bus);
  const availabilityColor =
    availability === "Available" ? "text-green-600"
    : availability === "Few Seats" ? "text-yellow-500"
    : "text-red-500";

  document.getElementById("busInfo").innerHTML = `
    <div class="space-y-2">
      <h4 class="font-bold text-lg">${bus.bus_id}</h4>
      <p><b>Route:</b> ${bus.routeName || "-"}</p>
      <p><b>Latitude:</b> ${bus.latitude}</p>
      <p><b>Longitude:</b> ${bus.longitude}</p>
      <p><b>Time:</b> ${bus.timestamp || "-"}</p>
      <p><b>ETA:</b> ${bus.etaMinutes ?? "-"} min</p>
      <p><b>Delay:</b> ${bus.delayMinutes ?? 0} min</p>
      <p><b>Seats Available:</b> ${bus.availableSeats ?? 0}</p>
      <p><b>Status:</b> <span class="${availabilityColor} font-semibold">${availability}</span></p>
    </div>
  `;
}

function listenToBuses() {
  const busesRef = collection(db, "buses");
  onSnapshot(busesRef, (snapshot) => {
    buses = snapshot.docs.map(doc => doc.data());
    buses.forEach(bus => {
      updateMarker(bus);
      checkAlerts(bus);
    });
    buses.sort((a, b) => (a.bus_id || "").localeCompare(b.bus_id || ""));
    renderBusList();
    if (selectedBus) {
      const updated = buses.find(b => b.bus_id === selectedBus.bus_id);
      if (updated) {
        selectedBus = updated;
        showBusDetails(updated);
      }
    }
  });
}

document.getElementById("themeToggle").addEventListener("click", toggleTheme);
document.getElementById("searchInput").addEventListener("input", renderBusList);
document.getElementById("availabilityFilter").addEventListener("change", renderBusList);

applyTheme();
initMap();
listenToBuses();
