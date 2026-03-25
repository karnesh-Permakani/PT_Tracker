const socket = io();

const tableBody = document.getElementById("busTableBody");
const busCount = document.getElementById("busCount");
const liveEntryCount = document.getElementById("liveEntryCount");

// Create map
const map = L.map("map").setView([12.9716, 77.5946], 12);

// Tile layer
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

// Store markers and trails
const busMarkers = {};
const busTrails = {};
const trailPoints = {};

// Bus colors
function getBusColor(busId) {
  const colors = {
    BUS101: "red",
    BUS102: "blue",
    BUS103: "green",
    BUS104: "orange",
    BUS105: "purple",
    BUS106: "brown",
    BUS107: "pink",
    BUS108: "cyan",
    BUS109: "magenta",
    BUS110: "black"
  };

  return colors[busId] || "gray";
}

function getStatusClass(status) {
  const s = (status || "").toLowerCase();

  if (s === "running") return "status-running";
  if (s === "stopped") return "status-stopped";
  if (s === "offline") return "status-offline";
  return "";
}

function createBusEmojiIcon(color) {
  return L.divIcon({
    className: "custom-bus-icon",
    html: `
      <div style="
        font-size: 28px;
        line-height: 30px;
        text-align: center;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.35));
      ">
        <span style="display:inline-block;">🚌</span>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
}

function renderTable(buses) {
  tableBody.innerHTML = "";

  buses.forEach((bus) => {
    const row = document.createElement("tr");
    const statusClass = getStatusClass(bus.status);

    row.innerHTML = `
      <td>${bus.bus_id}</td>
      <td>${Number(bus.latitude).toFixed(6)}</td>
      <td>${Number(bus.longitude).toFixed(6)}</td>
      <td>${new Date(bus.timestamp).toLocaleString()}</td>
      <td class="${statusClass}">${bus.status}</td>
    `;

    tableBody.appendChild(row);
  });
}

function updateMap(buses) {
  const bounds = [];

  buses.forEach((bus) => {
    const busId = bus.bus_id;
    const lat = Number(bus.latitude);
    const lng = Number(bus.longitude);
    const color = bus.color || getBusColor(busId);

    if (isNaN(lat) || isNaN(lng)) return;

    const position = [lat, lng];
    bounds.push(position);

    if (!busMarkers[busId]) {
      busMarkers[busId] = L.marker(position, {
        icon: createBusEmojiIcon(color)
      }).addTo(map);

      busMarkers[busId].bindPopup(`
        <b>${busId}</b><br>
        Latitude: ${lat.toFixed(6)}<br>
        Longitude: ${lng.toFixed(6)}<br>
        Status: ${bus.status}
      `);

      trailPoints[busId] = [position];

      busTrails[busId] = L.polyline(trailPoints[busId], {
        color: color,
        weight: 4,
        opacity: 0.8
      }).addTo(map);
    } else {
      busMarkers[busId].setLatLng(position);
      busMarkers[busId].setPopupContent(`
        <b>${busId}</b><br>
        Latitude: ${lat.toFixed(6)}<br>
        Longitude: ${lng.toFixed(6)}<br>
        Status: ${bus.status}
      `);

      trailPoints[busId].push(position);
      busTrails[busId].setLatLngs(trailPoints[busId]);
      busTrails[busId].setStyle({ color: color });
    }
  });

  if (bounds.length > 0) {
    map.fitBounds(bounds, { padding: [30, 30] });
  }
}

socket.on("connect", () => {
  console.log("Connected to server");
});

socket.on("busDataUpdate", (buses) => {
  console.log("Received live buses:", buses);

  busCount.textContent = buses.length;
  liveEntryCount.textContent = buses.length;

  renderTable(buses);
  updateMap(buses);
});

socket.on("disconnect", () => {
  console.log("Disconnected from server");
});