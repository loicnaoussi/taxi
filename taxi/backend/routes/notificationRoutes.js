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

            console.log("🔹 Requête reçue pour envoyer une notification :", { user_id, title, message });

            // 📌 Insérer la notification en base de données
            const [result] = await db.query(
                `INSERT INTO notifications (user_id, title, message, is_read, created_at) VALUES (?, ?, ?, false, NOW())`,
                [user_id, title, message]
            );

            if (result.affectedRows === 0) {
                console.log("❌ Erreur : La notification n'a pas été insérée en base.");
                return res.status(500).json({ message: "Échec de l'enregistrement de la notification." });
            }

            // 📡 Vérifier si l'utilisateur est connecté pour lui envoyer une notification en temps réel
            if (io.sockets.sockets.size > 0 && io.sockets.adapter.rooms.has(`user_${user_id}`)) {
                console.log(`📡 Envoi WebSocket à l'utilisateur ${user_id}`);
                io.to(`user_${user_id}`).emit("new_notification", { title, message });
            } else {
                console.log(`⚠️ L'utilisateur ${user_id} n'est pas connecté. La notification est stockée en base.`);
            }

            res.status(201).json({ message: "Notification envoyée avec succès !" });
        } catch (error) {
            console.error("🔥 Erreur lors de l'envoi de la notification :", error);
            res.status(500).json({ error: error.message });
        }
    });

    // 📌 Récupérer les notifications d'un utilisateur
    router.get("/my-notifications", authMiddleware, async (req, res) => {
        try {
            const userId = req.user.user_id;
            console.log(`🔹 Récupération des notifications pour user_id: ${userId}`);

            const [notifications] = await db.query(
                `SELECT notification_id, title, message, is_read, created_at 
                 FROM notifications 
                 WHERE user_id = ? 
                 ORDER BY created_at DESC`,
                [userId]
            );

            if (notifications.length === 0) {
                console.log(`⚠️ Aucune notification trouvée pour user_id: ${userId}`);
            } else {
                console.log("✅ Notifications récupérées :", notifications);
            }

            res.status(200).json({ notifications });
        } catch (error) {
            console.error("🔥 Erreur lors de la récupération des notifications :", error);
            res.status(500).json({ error: error.message });
        }
    });

    // 📌 Marquer toutes les notifications comme lues
    router.put("/mark-as-read", authMiddleware, async (req, res) => {
        try {
            const userId = req.user.user_id;

            const [result] = await db.query(
                "UPDATE notifications SET is_read = TRUE WHERE user_id = ?",
                [userId]
            );

            if (result.affectedRows === 0) {
                return res.status(400).json({ message: "Aucune notification à marquer comme lue." });
            }

            res.json({ message: "Toutes les notifications ont été marquées comme lues." });
        } catch (error) {
            console.error("🔥 Erreur lors de la mise à jour des notifications :", error);
            res.status(500).json({ error: error.message });
        }
    });

    return router;
};
