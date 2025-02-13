const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const db = require("../config/db");

// 🔹 1️⃣ Créer un trajet (Passager uniquement)
router.post("/create", authMiddleware, async (req, res) => {
    const { pickup_location, dropoff_location, fare } = req.body;

    if (!pickup_location || !dropoff_location || !fare) {
        return res.status(400).json({ message: "Tous les champs sont requis." });
    }

    if (req.user.user_type !== "passenger") {
        return res.status(403).json({ message: "Seuls les passagers peuvent créer des trajets." });
    }

    try {
        const [result] = await db.query(
            "INSERT INTO rides (passenger_id, pickup_location, dropoff_location, status, fare) VALUES (?, ?, ?, 'requested', ?)",
            [req.user.user_id, pickup_location, dropoff_location, fare]
        );

        res.status(201).json({ message: "Trajet créé avec succès !", ride_id: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🔹 2️⃣ Accepter un trajet (Chauffeur uniquement)
router.post("/accept/:ride_id", authMiddleware, async (req, res) => {
    if (req.user.user_type !== "driver") {
        return res.status(403).json({ message: "Seuls les chauffeurs peuvent accepter des trajets." });
    }

    const { ride_id } = req.params;

    try {
        const [ride] = await db.query("SELECT * FROM rides WHERE ride_id = ?", [ride_id]);
        if (ride.length === 0) return res.status(404).json({ message: "Trajet non trouvé." });

        if (ride[0].status !== "requested") {
            return res.status(400).json({ message: "Ce trajet n'est plus disponible." });
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

// 🔹 3️⃣ Annuler un trajet (Passager ou Chauffeur)
router.post("/cancel/:ride_id", authMiddleware, async (req, res) => {
    const { ride_id } = req.params;

    try {
        const [ride] = await db.query("SELECT * FROM rides WHERE ride_id = ?", [ride_id]);

        if (ride.length === 0) return res.status(404).json({ message: "Trajet non trouvé." });

        if (ride[0].passenger_id !== req.user.user_id && ride[0].driver_id !== req.user.user_id) {
            return res.status(403).json({ message: "Vous ne pouvez pas annuler ce trajet." });
        }

        await db.query("UPDATE rides SET status = 'canceled' WHERE ride_id = ?", [ride_id]);

        res.json({ message: "Trajet annulé avec succès." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🔹 4️⃣ Voir les trajets de l'utilisateur connecté
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

// 🔹 5️⃣ Récupérer un trajet spécifique par ID
router.get("/:ride_id", authMiddleware, async (req, res) => {
    const { ride_id } = req.params;

    try {
        const [ride] = await db.query("SELECT * FROM rides WHERE ride_id = ?", [ride_id]);

        if (ride.length === 0) {
            return res.status(404).json({ message: "Trajet non trouvé." });
        }

        res.json(ride[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🔹 6️⃣ Mise à jour de la position GPS du chauffeur
router.post("/update-location", authMiddleware, async (req, res) => {
    const { latitude, longitude } = req.body;
    const userId = req.user.user_id;

    if (req.user.user_type !== "driver") {
        return res.status(403).json({ message: "Seuls les chauffeurs peuvent mettre à jour leur position." });
    }

    if (!latitude || !longitude) {
        return res.status(400).json({ message: "Latitude et longitude sont requis." });
    }

    try {
        const [result] = await db.query(
            `INSERT INTO user_location (user_id, latitude, longitude, last_updated) 
             VALUES (?, ?, ?, NOW()) 
             ON DUPLICATE KEY UPDATE 
             latitude = VALUES(latitude), 
             longitude = VALUES(longitude), 
             last_updated = NOW()`,
            [userId, latitude, longitude]
        );

        if (result.affectedRows === 0) {
            return res.status(500).json({ message: "Échec de la mise à jour de la position." });
        }

        console.log(`📍 Position mise à jour pour user_id ${userId} : (${latitude}, ${longitude})`);
        res.status(200).json({ message: "Position mise à jour avec succès" });
    } catch (error) {
        console.error("🔥 Erreur lors de la mise à jour de la position :", error);
        res.status(500).json({ error: error.message });
    }
});

// 🔹 7️⃣ Récupération de la position d’un chauffeur
router.get("/location/:driver_id", authMiddleware, async (req, res) => {
    const { driver_id } = req.params;

    try {
        const [location] = await db.query(
            `SELECT latitude, longitude, last_updated 
             FROM user_location 
             WHERE user_id = ?`,
            [driver_id]
        );

        if (location.length === 0) {
            console.warn(`⚠️ Aucune position trouvée pour le chauffeur user_id ${driver_id}`);
            return res.status(404).json({ message: "Position non trouvée." });
        }

        console.log(`📍 Position trouvée pour user_id ${driver_id} :`, location[0]);
        res.status(200).json(location[0]);
    } catch (error) {
        console.error("🔥 Erreur lors de la récupération de la position :", error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
