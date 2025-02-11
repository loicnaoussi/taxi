const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const db = require("../config/db");

// 📌 Envoyer une notification
router.post("/send", authMiddleware, async (req, res) => {
    try {
        const { user_id, title, message } = req.body;

        if (!user_id || !title || !message) {
            return res.status(400).json({ message: "Tous les champs sont requis." });
        }

        await db.query(
            "INSERT INTO notifications (user_id, title, message, is_read) VALUES (?, ?, ?, false)",
            [user_id, title, message]
        );

        res.status(201).json({ message: "Notification envoyée avec succès !" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 📌 Récupérer les notifications d'un utilisateur
router.get("/my-notifications", authMiddleware, async (req, res) => {
    try {
        const [notifications] = await db.query("SELECT * FROM notifications WHERE user_id = ?", [req.user.user_id]);

        res.json(notifications);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
