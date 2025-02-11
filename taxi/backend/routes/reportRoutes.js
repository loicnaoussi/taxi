const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const db = require("../config/db");

// 📌 Signaler un problème sur un trajet
router.post("/report", authMiddleware, async (req, res) => {
    try {
        const { ride_id, issue_type, description } = req.body;

        if (!ride_id || !issue_type || !description) {
            return res.status(400).json({ message: "Tous les champs sont requis." });
        }

        await db.query(
            "INSERT INTO issue_reports (user_id, ride_id, issue_type, description, status) VALUES (?, ?, ?, ?, 'pending')",
            [req.user.user_id, ride_id, issue_type, description]
        );

        res.status(201).json({ message: "Réclamation envoyée avec succès !" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 📌 Voir les réclamations envoyées par un utilisateur
router.get("/my-reports", authMiddleware, async (req, res) => {
    try {
        const [reports] = await db.query("SELECT * FROM issue_reports WHERE user_id = ?", [req.user.user_id]);

        res.json(reports);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
