require("dotenv").config({ path: process.env.NODE_ENV === "test" ? ".env.test" : ".env" });
console.log(`🔹 Fichier ${process.env.NODE_ENV === "test" ? ".env.test" : ".env"} chargé.`);
console.log("🔹 DB_NAME =", process.env.DB_NAME);

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
const protectedRoutes = require("./routes/protectedRoutes");
const rideRoutes = require("./routes/rideRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const qrCodeRoutes = require("./routes/qrCodeRoutes");
const emergencyRoutes = require("./routes/emergencyRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const userRoutes = require("./routes/userRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const reportRoutes = require("./routes/reportRoutes");
const historyRoutes = require("./routes/historyRoutes");
const issueReportsRoutes = require("./routes/issueReportsRoutes");
const verificationRoutes = require("./routes/verificationRoutes"); 
const vehicleRoutes = require("./routes/vehicleRoutes"); 
const driverRoutes = require("./routes/driverRoutes"); 




const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// 🔹 Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));
app.use(helmet());
app.use(compression());
app.use(morgan("dev"));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: "Trop de requêtes, veuillez réessayer plus tard."
});
app.use(limiter);

// 🔹 Import des routes
app.use("/api/auth", authRoutes);
app.use("/api/rides", rideRoutes);
app.use("/api/protected", protectedRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/qrcodes", qrCodeRoutes);
app.use("/api/emergency", emergencyRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/users", userRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/history", historyRoutes.router);
app.use("/api/reports/issues", issueReportsRoutes);
app.use("/api/verification", verificationRoutes);
app.use("/api/vehicles", vehicleRoutes); 
app.use("/api/drivers", driverRoutes); 



// 🔹 Gestion des WebSockets
let connectedUsers = {};

io.on("connection", (socket) => {
    console.log("🟢 Un utilisateur s'est connecté :", socket.id);

    socket.on("register", (userData) => {
        connectedUsers[userData.user_id] = socket.id;
        console.log(`🔗 Utilisateur ${userData.user_id} enregistré avec le socket ${socket.id}`);
    });

    socket.on("rideStatusUpdate", async (data) => {
        const { ride_id, status } = data;
        await db.query("UPDATE rides SET status = ? WHERE ride_id = ?", [status, ride_id]);

        io.emit("rideStatusChanged", { ride_id, status });
        console.log(`📡 Statut du trajet ${ride_id} mis à jour à ${status}`);
    });

    socket.on("disconnect", () => {
        console.log("🔴 Un utilisateur s'est déconnecté :", socket.id);
        Object.keys(connectedUsers).forEach((userId) => {
            if (connectedUsers[userId] === socket.id) {
                delete connectedUsers[userId];
            }
        });
    });
});

// 🔹 Middleware Global pour gérer les erreurs
app.use((err, req, res, next) => {
    console.error("🔥 Erreur Serveur :", err.stack);
    res.status(500).json({ message: "Erreur interne du serveur." });
});

// 🔹 Route de test
app.get("/", (req, res) => {
    res.send("🚀 Backend Taxi API with WebSockets is running!");
});

// 🔹 Démarrer le serveur uniquement si on n'est pas en mode test
const PORT = process.env.NODE_ENV === "test" ? 5001 : process.env.PORT || 5000;
if (process.env.NODE_ENV !== "test") {
    server.listen(PORT, () => {
        console.log(`✅ Serveur démarré sur le port ${PORT} avec WebSockets`);
    });
} else {
    console.log(`🚀 Mode TEST actif, serveur prêt sur le port ${PORT}`);
}


const listEndpoints = require("express-list-endpoints");
const fs = require("f