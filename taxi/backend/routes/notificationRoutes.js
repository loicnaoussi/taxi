const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const db = require("../config/db");

module.exports = (io) => {
    
    // 📌 Envoyer une notification (Avec WebSockets)
    router.post("/send", authMiddleware, async (req, res) => {
        try {
            const { user_id, title, message } = req.body;

            if (!user_id || !title || !message) {
                return res.status(400).json({ message: "Tous les champs sont requis." });
            }

            // 📌 Insérer la notification en base de données
            await db.query(
                "INSERT INTO notifications (user_id, title, message, is_read, created_at) VALUES (?, ?, ?, false, NOW())",
                [user_id, title, message]
            );

            // 📌 Envoyer la notification en temps réel via WebSockets
            io.to(`user_${user_id}`).emit("new_notification", { title, message });

            res.status(201).json({ message: "Notification envoyée avec succès !" });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // 📌 Récupérer les notifications d'un utilisateur
    router.get("/my-notifications", authMiddleware, async (req, res) => {
        try {
            const [notifications] = await db.query(
                "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC",
                [req.user.user_id]
            );

            res.json({ notifications });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // 📌 Marquer toutes les notifications comme lues
    router.put("/mark-as-read", authMiddleware, async (req, res) => {
        try {
            await db.query(
                "UPDATE notifications SET is_read = TRUE WHERE user_id = ?",
                [req.user.user_id]
            );
            res.json({ message: "Toutes les notifications ont été marquées comme lues." });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    return router;
};
