const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const db = require("../config/db");

// 📌 1. Enregistrer une action dans l'historique
async function logHistory(user_id, ride_id, action_type, details) {
    try {
        await db.query(
            "INSERT INTO history (user_id, ride_id, action_type, details, timestamp) VALUES (?, ?, ?, ?, NOW())",
            [user_id, ride_id, action_type, details]
        );
    } catch (error) {
        console.error("❌ Erreur lors de l'enregistrement de l'historique :", error);
    }
}

// 📌 2. Voir l'historique des trajets d'un utilisateur (passager ou chauffeur)
router.get("/my-rides", authMiddleware, async (req, res) => {
    try {
        const [rides] = await db.query(
            "SELECT ride_id, pickup_location, dropoff_location, status, created_at FROM rides WHERE passenger_id = ? OR driver_id = ? ORDER BY created_at DESC LIMIT 50",
            [req.user.user_id, req.user.user_id]
        );

        res.json({ total: rides.length, rides });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 📌 3. Récupérer les détails d'un trajet spécifique
router.get("/ride/:ride_id", authMiddleware, async (req, res) => {
    try {
        const { ride_id } = req.params;
        const [ride] = await db.query(
            "SELECT ride_id, passenger_id, driver_id, pickup_location, dropoff_location, status, created_at FROM rides WHERE ride_id = ? AND (passenger_id = ? OR driver_id = ?)",
            [ride_id, req.user.user_id, req.user.user_id]
        );

        if (ride.length === 0) {
            return res.status(404).json({ message: "Trajet non trouvé ou non accessible." });
        }

        res.json(ride[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 📌 4. Voir l'historique des actions d'un utilisateur
router.get("/actions/my-history", authMiddleware, async (req, res) => {
    try {
        const [history] = await db.query(
            "SELECT history_id, action_type, details, timestamp FROM history WHERE user_id = ? ORDER BY timestamp DESC LIMIT 50",
            [req.user.user_id]
        );

        res.json({ total: history.length, history });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 📌 5. Voir tout l'historique des actions (Admin uniquement)
router.get("/actions/admin/history", authMiddleware, async (req, res) => {
    try {
        if (req.user.user_type !== "admin") {
            return res.status(403).json({ message: "Accès réservé aux administrateurs." });
        }

        const [history] = await db.query("SELECT history_id, user_id, ride_id, action_type, details, timestamp FROM history ORDER BY timestamp DESC LIMIT 100");

        res.json({ total: history.length, history });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 📌 6. Voir l'historique des actions d'un utilisateur spécifique (Admin)
router.get("/actions/admin/user/:user_id", authMiddleware, async (req, res) => {
    try {
        if (req.user.user_type !== "admin") {
            return res.status(403).json({ message: "Accès réservé aux administrateurs." });
        }

        const { user_id } = req.params;
        const [history] = await db.query(
            "SELECT history_id, ride_id, action_type, details, timestamp FROM history WHERE user_id = ? ORDER BY timestamp DESC LIMIT 50",
            [user_id]
        );

        res.json({ total: history.length, history });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router; // 🔹 Corrigé : On exporte directement `router`
