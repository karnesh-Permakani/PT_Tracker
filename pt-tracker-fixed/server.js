

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const db = require("./firebase");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static("public"));

// Get all buses
app.get("/api/buses", async (req, res) => {
  try {
    const snapshot = await db.collection("buses").get();
    const buses = snapshot.docs.map(doc => doc.data());
    res.json(buses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add or update one bus
app.post("/api/update-bus", async (req, res) => {
  try {
    const { bus_id, latitude, longitude, status } = req.body;

    if (!bus_id || latitude === undefined || longitude === undefined || !status) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const busData = {
      bus_id,
      latitude: Number(latitude),
      longitude: Number(longitude),
      timestamp: new Date().toISOString(),
      status
    };

    await db.collection("buses").doc(bus_id).set(busData);

    res.json({
      message: "Bus updated successfully",
      bus: busData
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Firestore realtime listener
db.collection("buses").onSnapshot(
  (snapshot) => {
    const buses = snapshot.docs.map(doc => doc.data());
    io.emit("busDataUpdate", buses);
  },
  (error) => {
    console.error("Firestore listener error:", error);
  }
);

// Socket connection
io.on("connection", async (socket) => {
  console.log("User connected:", socket.id);

  try {
    const snapshot = await db.collection("buses").get();
    const buses = snapshot.docs.map(doc => doc.data());
    socket.emit("busDataUpdate", buses);
  } catch (error) {
    console.error("Error sending initial bus data:", error);
  }

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});