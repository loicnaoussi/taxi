const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const db = require("../config/db");

// 🔹 1. Signaler un problème sur un trajet
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

// 🔹 2. Voir les réclamations envoyées par un utilisateur
router.get("/my-reports", authMiddleware, async (req, res) => {
    try {
        const [reports] = await db.query("SELECT * FROM issue_reports WHERE user_id = ?", [req.user.user_id]);

        res.json(reports);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🔹 3. Voir toutes les réclamations (Admin uniquement)
router.get("/admin/reports", authMiddleware, async (req, res) => {
    try {
        if (req.user.user_type !== "admin") {
            return res.status(403).json({ message: "Accès refusé. Seuls les administrateurs peuvent voir les signalements." });
        }

        const [reports] = await db.query("SELECT * FROM issue_reports ORDER BY created_at DESC");

        res.json(reports);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🔹 4. Mettre à jour le statut d'un signalement (Admin uniquement)
router.put("/admin/update/:report_id", authMiddleware, async (req, res) => {
    try {
        if (req.user.user_type !== "admin") {
            return res.status(403).json({ message: "Accès refusé. Seuls les administrateurs peuvent mettre à jour les signalements." });
        }

        const { status } = req.body;
        const { report_id } = req.params;

        const allowedStatuses = ["pending", "reviewed", "resolved"];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ message: "Statut invalide." });
        }

        await db.query("UPDATE issue_reports SET status = ? WHERE report_id = ?", [status, report_id]);

        res.json({ message: `Statut de la réclamation mis à jour à '${status}'.` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
