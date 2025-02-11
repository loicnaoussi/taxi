const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const db = require("../config/db");

// 📌 Récupérer les paramètres de l'application
router.get("/", async (req, res) => {
    try {
        const [settings] = await db.query("SELECT * FROM settings LIMIT 1");

        if (settings.length === 0) {
            return res.json({ message: "Aucun paramètre trouvé." });
        }

        res.json(settings[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 📌 Modifier les paramètres (Admin uniquement)
router.put("/update", authMiddleware, async (req, res) => {
    try {
        if (req.user.user_type !== "admin") {
            return res.status(403).json({ message: "Seuls les administrateurs peuvent modifier les paramètres." });
        }

        const { base_fare, cost_per_km, max_distance_km } = req.body;

        await db.query(
            "UPDATE settings SET base_fare = ?, cost_per_km = ?, max_distance_km = ?",
            [base_fare, cost_per_km, max_distance_km]
        );

        res.json({ message: "Paramètres mis à jour avec succès !" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
