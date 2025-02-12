const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const db = require("../config/db");
const { io } = require("../server");

// 📌 Mise à jour de la position d’un utilisateur (chauffeur)
router.post("/update", authMiddleware, async (req, res) => {
    try {
        const { latitude, longitude } = req.body;
        const userId = req.user.user_id;

        if (!latitude || !longitude) {
            return res.status(400).json({ message: "Latitude et longitude sont requises." });
        }

        // Mettre à jour la position dans la base de données
        await db.query(
            "INSERT INTO user_location (user_id, latitude, longitude, last_updated) VALUES (?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE latitude = VALUES(latitude), longitude = VALUES(longitude), last_updated = NOW()",
            [userId, latitude, longitude]
        );

        // Émettre la nouvelle position via WebSockets
        io.emit("location_update", { userId, latitude, longitude });

        res.json({ message: "Position mise à jour avec succès." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 📌 Récupérer la position d’un chauffeur en temps réel
router.get("/driver/:driver_id", authMiddleware, async (req, res) => {
    try {
        const { driver_id } = req.params;
        const [location] = await db.query("SELECT latitude, longitude, last_updated FROM user_location WHERE user_id = ?", [driver_id]);

        if (location.length === 0) {
            return res.status(404).json({ message: "Localisation introuvable pour ce chauffeur." });
        }

        res.json(location[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
