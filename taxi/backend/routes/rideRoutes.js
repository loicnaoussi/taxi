const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const db = require("../config/db");

// 🔹 Créer un trajet
router.post("/create", authMiddleware, async (req, res) => {
    const { pickup_location, dropoff_location, fare } = req.body;
    if (!pickup_location || !dropoff_location || !fare) {
        return res.status(400).json({ message: "Tous les champs sont requis." });
    }

    try {
        if (req.user.user_type !== "passenger") {
            return res.status(403).json({ message: "Seuls les passagers peuvent créer des trajets." });
        }

        const [result] = await db.query(
            "INSERT INTO rides (passenger_id, pickup_location, dropoff_location, status, fare) VALUES (?, ?, ?, 'requested', ?)",
            [req.user.user_id, pickup_location, dropoff_location, fare]
        );

        res.status(201).json({ message: "Trajet créé avec succès !", ride_id: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🔹 Accepter un trajet
router.post("/accept/:ride_id", authMiddleware, async (req, res) => {
    try {
        if (req.user.user_type !== "driver") {
            return res.status(403).json({ message: "Seuls les chauffeurs peuvent accepter des trajets." });
        }

        const { ride_id } = req.params;
        const [ride] = await db.query("SELECT * FROM rides WHERE ride_id = ?", [ride_id]);

        if (ride.length === 0) {
            return res.status(404).json({ message: "Trajet non trouvé." });
        }

        if (ride[0].status !== "requested") {
            return res.status(400).json({ message: "Ce trajet a déjà été pris ou annulé." });
        }

        if (ride[0].driver_id !== null) {
            return res.status(400).json({ message: "Ce trajet est déjà attribué à un chauffeur." });
        }

        await db.query("UPDATE rides SET driver_id = ?, status = 'accepted' WHERE ride_id = ?", [
            req.user.user_id,
            ride_id,
        ]);

        res.json({ message: "Trajet accepté avec succès !" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🔹 Annuler un trajet
router.post("/cancel/:ride_id", authMiddleware, async (req, res) => {
    try {
        const { ride_id } = req.params;

        const [ride] = await db.query("SELECT * FROM rides WHERE ride_id = ?", [ride_id]);

        if (ride.length === 0) {
            return res.status(404).json({ message: "Trajet non trouvé." });
        }

        if (ride[0].passenger_id !== req.user.user_id && ride[0].driver_id !== req.user.user_id) {
            return res.status(403).json({ message: "Vous ne pouvez pas annuler ce trajet." });
        }

        await db.query("UPDATE rides SET status = 'canceled' WHERE ride_id = ?", [ride_id]);

        res.json({ message: "Trajet annulé avec succès." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 📌 Voir les trajets d'un utilisateur (passager ou chauffeur)
router.get("/my-rides", authMiddleware, async (req, res) => {
    try {
        const [rides] = await db.query(
            "SELECT ride_id, pickup_location, dropoff_location, status, created_at FROM rides WHERE passenger_id = ? OR driver_id = ? ORDER BY created_at DESC",
            [req.user.user_id, req.user.user_id]
        );

        res.json({ rides });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 📌 Récupérer un trajet spécifique par son ID
router.get("/:ride_id", authMiddleware, async (req, res) => {
    try {
        const { ride_id } = req.params;
        const [ride] = await db.query(
            "SELECT * FROM rides WHERE ride_id = ?",
            [ride_id]
        );

        if (ride.length === 0) {
            return res.status(404).json({ message: "Trajet non trouvé." });
        }

        res.json(ride[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
