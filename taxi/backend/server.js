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
const historyRoutes = require("./routes/historyRoutes");
const reportRoutes = require("./routes/reportRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const qrCodeRoutes = require("./routes/qrCodeRoutes");
const userRoutes = require("./routes/userRoutes");
const userLocationRoutes = require("./routes/userLocationRoutes");
const locationRoutes = require("./routes/locationRoutes");
const adminDashboardRoutes = require("./routes/adminDashboardRoutes");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

app.use(cors());
app.use(bodyParser.json());
app.use(express.json());
app.use(helmet());
app.use(compression());
app.use(morgan("dev"));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: "Trop de requêtes, réessayez plus tard."
});
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
app.use("/api/location", userLocationRoutes);
app.use("/api/location", locationRoutes);
app.use("/api/admin", adminDashboardRoutes);

// 📡 Gestion des WebSockets
let connectedUsers = {};
let driverLocations = {}; // Stockage des positions des chauffeurs en temps réel

// 📌 Gestion du suivi en temps réel des chauffeurs et passagers
io.on("connection", (socket) => {
    console.log("🟢 Utilisateur connecté :", socket.id);

    // Association du socket à un utilisateur
    socket.on("userConnected", (userId) => {
        connectedUsers[userId] = socket.id;
        console.log(`✅ Utilisateur ${userId} associé à Socket ID : ${socket.id}`);
    });

    // 📌 Mise à jour de la position du chauffeur en temps réel
    socket.on("updateLocation", async ({ userId, latitude, longitude }) => {
        if (!userId || !latitude || !longitude) return;

        // Mettre à jour la position dans la base de données
        await db.query(
            "INSERT INTO user_location (user_id, latitude, longitude) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE latitude = VALUES(latitude), longitude = VALUES(longitude), last_updated = NOW()",
            [userId, latitude, longitude]
        );

        // Diffuser la mise à jour à tous les passagers connectés
        io.emit("locationUpdated", { userId, latitude, longitude });
    });

    // Déconnexion de l'utilisateur
    socket.on("disconnect", () => {
        const userId = Object.keys(connectedUsers).find(key => connectedUsers[key] === socket.id);
        if (userId) {
            delete connectedUsers[userId];
            console.log(`🔴 Utilisateur ${userId} déconnecté`);
        }
    });
});


// 📌 Fonction d'envoi de notifications en temps réel
const sendNotification = async (userId, message) => {
    if (connectedUsers[userId]) {
        io.to(connectedUsers[userId]).emit("newNotification", { message });
    }

    // Sauvegarde de la notification en base de données
    await db.query("INSERT INTO notifications (user_id, title, message, is_read, created_at) VALUES (?, ?, ?, ?, NOW())", [
        userId,
        "Nouvelle Notification",
        message,
        false
    ]);
};

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

module.exports = { app, server, io, sendNotification };
