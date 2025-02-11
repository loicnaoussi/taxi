require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const db = require("./config/db");
const http = require("http");
const { Server } = require("socket.io");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const compression = require("compression");
const morgan = require("morgan");

const authRoutes = require("./routes/authRoutes");
const rideRoutes = require("./routes/rideRoutes");
const vehicleRoutes = require("./routes/vehicleRoutes");
const verificationRoutes = require("./routes/verificationRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const emergencyRoutes = require("./routes/emergencyRoutes");
const historyRoutes = require("./routes/historyRoutes"); // ✅ Correct
const reportRoutes = require("./routes/reportRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const qrCodeRoutes = require("./routes/qrCodeRoutes");
const userRoutes = require("./routes/userRoutes");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

app.use(cors());
app.use(bodyParser.json());
app.use(express.json());
app.use(helmet());
app.use(compression());
app.use(morgan("dev"));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, message: "Trop de requêtes, réessayez plus tard." });
app.use(limiter);

// 📌 Import des routes
app.use("/api/auth", authRoutes);
app.use("/api/rides", rideRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/verification", verificationRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/emergency", emergencyRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/qrcodes", qrCodeRoutes);
app.use("/api/users", userRoutes);

// 📌 Gestion des WebSockets
let connectedUsers = {};
io.on("connection", (socket) => {
    console.log("🟢 Utilisateur connecté :", socket.id);
    socket.on("disconnect", () => {
        console.log("🔴 Utilisateur déconnecté :", socket.id);
    });
});

// 📌 Middleware Global pour gérer les erreurs
app.use((err, req, res, next) => {
    console.error("🔥 Erreur Serveur :", err.stack);
    res.status(500).json({ message: "Erreur interne du serveur." });
});

// 📌 Route de test
app.get("/", (req, res) => {
    res.send("🚀 Backend Taxi API is running!");
});

// 📌 Démarrer le serveur
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`✅ Serveur démarré sur le port ${PORT}`);
});

module.exports = { app, server };