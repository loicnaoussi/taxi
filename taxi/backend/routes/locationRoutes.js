const express = require("express");
const router = express.Router();
const db = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

// 📌 Récupérer la position d'un utilisateur
router.get("/:userId", authMiddleware, async (req, res) => {
    try {
        const { userId } = req.params;
        const [location] = await db.query("SELECT latitude, longitude, last_updated FROM user_location WHERE user_id = ?", [userId]);

        if (location.length === 0) {
            return res.status(404).json({ message: "Aucune position trouvée pour cet utilisateur." });
        }

        res.json(location[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
