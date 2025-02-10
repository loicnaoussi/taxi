const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const db = require("../config/db");

// 🔹 1. Enregistrer une action dans l'historique
async function logHistory(user_id, ride_id, action, details) {
    await db.query(
        "INSERT INTO history (user_id, ride_id, action, details) VALUES (?, ?, ?, ?)",
        [user_id, ride_id, action, details]
    );
}

// 🔹 2. Récupérer l'historique des trajets d'un utilisateur
router.get("/my-history", authMiddleware, async (req, res) => {
    try {
        const [rides] = await db.query(
            "SELECT * FROM rides WHERE passenger_id = ? OR driver_id = ? ORDER BY created_at DESC",
            [req.user.user_id, req.user.user_id]
        );

        res.json(rides);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🔹 3. Récupérer les détails d'un trajet spécifique
router.get("/ride/:ride_id", authMiddleware, async (req, res) => {
    try {
        const { ride_id } = req.params;

        const [ride] = await db.query(
            "SELECT * FROM rides WHERE ride_id = ? AND (passenger_id = ? OR driver_id = ?)",
            [ride_id, req.user.user_id, req.user.user_id]
        );

        if (ride.length === 0) {
            return res.status(404).json({ message: "Trajet non trouvé." });
        }

        res.json(ride[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🔹 4. Voir l'historique des actions d'un utilisateur
router.get("/actions/my-history", authMiddleware, async (req, res) => {
    try {
        const [history] = await db.query(
            "SELECT * FROM history WHERE user_id = ? ORDER BY timestamp DESC",
            [req.user.user_id]
        );

        res.json(history);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🔹 5. Voir tout l'historique des actions (Admin uniquement)
router.get("/actions/admin/history", authMiddleware, async (req, res) => {
    try {
        if (req.user.user_type !== "admin") {
            return res.status(403).json({ message: "Accès refusé." });
        }

        const [history] = await db.query("SELECT * FROM history ORDER BY timestamp DESC");
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🔹 6. Voir l'historique des actions d'un utilisateur spécifique (Admin)
router.get("/actions/admin/user/:user_id", authMiddleware, async (req, res) => {
    try {
        if (req.user.user_type !== "admin") {
            return res.status(403).json({ message: "Accès refusé." });
        }

        const { user_id } = req.params;
        const [history] = await db.query(
            "SELECT * FROM history WHERE user_id = ? ORDER BY timestamp DESC",
            [user_id]
        );

        res.json(history);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = { router, logHistory };
