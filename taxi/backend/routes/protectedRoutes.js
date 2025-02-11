const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const db = require("../config/db");

// 📌 1. Récupérer les informations utilisateur dans une route protégée
router.get("/profile", authMiddleware, async (req, res) => {
    try {
        // Récupérer les informations de l'utilisateur sans les champs sensibles
        const [user] = await db.query(
            "SELECT user_id, username, email, phone_number, full_name, user_type, created_at FROM users WHERE user_id = ?",
            [req.user.user_id]
        );

        if (user.length === 0) {
            return res.status(404).json({ status: "error", message: "Utilisateur non trouvé." });
        }

        res.json({
            status: "success",
            message: "Accès autorisé à l'espace protégé.",
            user: user[0],
        });
    } catch (error) {
        res.status(500).json({ status: "error", message: "Erreur serveur.", error: error.message });
    }
});

// 📌 2. Route test pour vérifier l'accès à une route protégée
router.get("/", authMiddleware, (req, res) => {
    res.json({ status: "success", message: "Bienvenue dans la route protégée !" });
});

module.exports = router;
