const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");

const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const app = express();

app.use(cors());
app.use(express.json());

const ROUTES = [
  "Central → Egmore",
  "Egmore → T Nagar",
  "CMBT → Guindy",
  "Guindy → Adyar",
  "Adyar → Velachery",
  "Tambaram → Guindy",
  "Anna Nagar → Central",
  "Broadway → T Nagar",
  "Velachery → Central",
  "Tambaram → Broadway"
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function buildDerivedFields(busId, latitude, longitude, status, body) {
  const busNum = parseInt(String(busId).replace(/\D/g, ""), 10) || 101;
  const routeName = body.routeName || ROUTES[(busNum - 101) % ROUTES.length];

  const totalSeats = Number(body.totalSeats ?? 40);
  const occupiedSeats = clamp(Number(body.occupiedSeats ?? Math.floor(Math.random() * 35)), 0, totalSeats);
  const availableSeats = totalSeats - occupiedSeats;

  const speed = Number(body.speed ?? (20 + ((busNum * 7) % 30)));
  const etaMinutes = Number(body.etaMinutes ?? (1 + ((busNum * 3) % 10)));
  const delayMinutes = Number(body.delayMinutes ?? ((busNum * 2) % 8));

  return {
    bus_id: busId,
    latitude: Number(latitude),
    longitude: Number(longitude),
    status: status || "Running",
    routeName,
    totalSeats,
    occupiedSeats,
    availableSeats,
    speed,
    etaMinutes,
    delayMinutes,
    timestamp: body.timestamp || new Date().toISOString(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };
}

app.get("/", (req, res) => {
  res.send("PT Tracker backend running");
});

app.get("/api/buses", async (req, res) => {
  try {
    const snapshot = await db.collection("buses").get();
    const buses = snapshot.docs.map(doc => doc.data());
    res.json(buses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/update-bus", async (req, res) => {
  try {
    const { bus_id, latitude, longitude, status } = req.body;

    if (!bus_id || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: "Missing parameters" });
    }

    const busData = buildDerivedFields(bus_id, latitude, longitude, status, req.body);

    await db.collection("buses").doc(bus_id).set(busData, { merge: true });

    res.json({
      success: true,
      message: "Bus data stored in Firestore",
      data: busData
    });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, "0.0.0.0", () => {
  console.log("Server running on http://0.0.0.0:3000");
});