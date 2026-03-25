const shownAlerts = new Set();

export function showToast(type, message, key) {
  if (key && shownAlerts.has(key)) return;
  if (key) shownAlerts.add(key);

  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
    if (key) shownAlerts.delete(key);
  }, 5000);
}

export function checkAlerts(bus) {
  const eta = Number(bus.etaMinutes ?? 0);
  const delay = Number(bus.delayMinutes ?? 0);
  const availableSeats = Number(bus.availableSeats ?? 0);

  if (eta > 0 && eta <= 2) {
    showToast("arrival", `${bus.bus_id} arriving in ${eta} min`, `${bus.bus_id}-arrival-${eta}`);
  }

  if (delay >= 5) {
    showToast("delay", `${bus.bus_id} delayed by ${delay} min`, `${bus.bus_id}-delay-${delay}`);
  }

  if (availableSeats === 0) {
    showToast("info", `${bus.bus_id} is full`, `${bus.bus_id}-full`);
  }
}