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

        // Vérifier si le trajet existe
        const [ride] = await db.query("SELECT * FROM rides WHERE ride_id = ?", [ride_id]);

        if (ride.length === 0) {
            return res.status(404).json({ message: "Trajet introuvable." });
        }

        const [result] = await db.query(
            "INSERT INTO issue_reports (user_id, ride_id, issue_type, description, status) VALUES (?, ?, ?, ?, 'pending')",
            [req.user.user_id, ride_id, issue_type, description]
        );

        if (result.affectedRows === 0) {
            return res.status(500).json({ message: "Erreur lors de l'envoi de la réclamation." });
        }

        res.status(201).json({ message: "Réclamation envoyée avec succès !", report_id: result.insertId });

    } catch (error) {
        console.error("Erreur lors de l'envoi d'une réclamation :", error);
        res.status(500).json({ error: "Erreur interne du serveur." });
    }
});

// 📌 Voir les réclamations envoyées par un utilisateur
router.get("/my-reports", authMiddleware, async (req, res) => {
    try {
        const [reports] = await db.query("SELECT * FROM issue_reports WHERE user_id = ?", [req.user.user_id]);

        if (reports.length === 0) {
            return res.status(404).json({ message: "Aucune réclamation trouvée." });
        }

        res.json(reports);
    } catch (error) {
        console.error("Erreur lors de la récupération des réclamations :", error);
        res.status(500).json({ error: "Erreur interne du serveur." });
    }
});

// 📌 Voir toutes les réclamations (Admin uniquement)
router.get("/all-reports", authMiddleware, async (req, res) => {
    try {
        if (req.user.user_type !== "admin") {
            return res.status(403).json({ message: "Accès refusé. Réservé aux administrateurs." });
        }

        const [reports] = await db.query("SELECT * FROM issue_reports");

        if (reports.length === 0) {
            return res.status(404).json({ message: "Aucune réclamation trouvée." });
        }

        res.json(reports);
    } catch (error) {
        console.error("Erreur lors de la récupération de toutes les réclamations :", error);
        res.status(500).json({ error: "Erreur interne du serveur." });
    }
});

// 📌 Mettre à jour le statut d'une réclamation (Admin uniquement)
router.put("/admin/update/:report_id", authMiddleware, async (req, res) => {
    try {
        if (req.user.user_type !== "admin") {
            return res.status(403).json({ message: "Accès refusé. Réservé aux administrateurs." });
        }

        const { report_id } = req.params;
        const { status } = req.body;

        if (!["pending", "reviewed", "resolved"].includes(status)) {
            return res.status(400).json({ message: "Statut invalide." });
        }

        const [report] = await db.query("SELECT * FROM issue_reports WHERE report_id = ?", [report_id]);

        if (report.length === 0) {
            return res.status(404).json({ message: "Réclamation introuvable." });
        }

        await db.query("UPDATE issue_reports SET status = ? WHERE report_id = ?", [status, report_id]);

        res.json({ message: "Réclamation mise à jour avec succès." });
    } catch (error) {
        console.error("Erreur lors de la mise à jour de la réclamation :", error);
        res.status(500).json({ error: "Erreur interne du serveur." });
    }
});
// 🔹 Endpoint : Suppression d'un signalement (Admin uniquement)
router.delete("/admin/delete/:report_id", authMiddleware, async (req, res) => {
    const { report_id } = req.params;

    try {
        const [result] = await db.query(
            "DELETE FROM issue_reports WHERE report_id = ?",
            [report_id]
        );

        if (result.affectedRows === 0) {
            // ✅ Modification ici : Renvoyer 200 avec un message clair
            return res.status(200).json({ message: "Aucun signalement trouvé, peut-être déjà supprimé." });
        }

        res.status(200).json({ message: "Réclamation supprimée avec succès." });
    } catch (error) {
        console.error("🔥 Erreur suppression réclamation :", error);
        res.status(500).json({ error: "Erreur interne du serveur." });
    }
});


module.exports = router;
