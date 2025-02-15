const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const db = require("../config/db");

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * /api/reports/report:
 *   post:
 *     summary: Signaler un problème sur un trajet
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ride_id:
 *                 type: integer
 *               issue_type:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Réclamation envoyée avec succès
 *       400:
 *         description: Tous les champs sont requis ou données invalides
 *       500:
 *         description: Erreur serveur
 */
router.post("/report", authMiddleware, async (req, res) => {
    try {
        const { ride_id, issue_type, description } = req.body;

        if (!ride_id || !issue_type || !description) {
            return res.status(400).json({ message: "Tous les champs sont requis." });
        }

        // Vérifier que le trajet existe
        const [ride] = await db.query("SELECT ride_id FROM rides WHERE ride_id = ?", [ride_id]);
        if (ride.length === 0) {
            return res.status(404).json({ message: "Trajet introuvable." });
        }

        await db.query(
            "INSERT INTO issue_reports (user_id, ride_id, issue_type, description, status, created_at) VALUES (?, ?, ?, ?, 'pending', NOW())",
            [req.user.user_id, ride_id, issue_type, description]
        );

        res.status(201).json({ message: "Réclamation envoyée avec succès !" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/reports/my-reports:
 *   get:
 *     summary: Voir les réclamations envoyées par un utilisateur
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des réclamations
 *       500:
 *         description: Erreur serveur
 */
router.get("/my-reports", authMiddleware, async (req, res) => {
    try {
        const [reports] = await db.query(
            "SELECT report_id, ride_id, issue_type, description, status, created_at FROM issue_reports WHERE user_id = ? ORDER BY created_at DESC",
            [req.user.user_id]
        );

        res.json({ total: reports.length, reports });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/reports/admin/reports:
 *   get:
 *     summary: Voir toutes les réclamations (Admin uniquement)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste de toutes les réclamations
 *       403:
 *         description: Accès réservé aux administrateurs
 *       500:
 *         description: Erreur serveur
 */
router.get("/admin/reports", authMiddleware, async (req, res) => {
    try {
        if (req.user.user_type !== "admin") {
            return res.status(403).json({ message: "Accès refusé. Seuls les administrateurs peuvent voir les signalements." });
        }

        const [reports] = await db.query(
            "SELECT report_id, user_id, ride_id, issue_type, description, status, created_at FROM issue_reports ORDER BY created_at DESC"
        );

        res.json({ total: reports.length, reports });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/reports/admin/reports/user/{user_id}:
 *   get:
 *     summary: Voir les réclamations d'un utilisateur spécifique (Admin uniquement)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de l'utilisateur
 *     responses:
 *       200:
 *         description: Liste des réclamations de l'utilisateur
 *       403:
 *         description: Accès réservé aux administrateurs
 *       500:
 *         description: Erreur serveur
 */
router.get("/admin/reports/user/:user_id", authMiddleware, async (req, res) => {
    try {
        if (req.user.user_type !== "admin") {
            return res.status(403).json({ message: "Accès refusé. Seuls les administrateurs peuvent voir ces signalements." });
        }

        const { user_id } = req.params;
        const [reports] = await db.query(
            "SELECT report_id, ride_id, issue_type, description, status, created_at FROM issue_reports WHERE user_id = ? ORDER BY created_at DESC",
            [user_id]
        );

        res.json({ total: reports.length, reports });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/reports/admin/update/{report_id}:
 *   put:
 *     summary: Mettre à jour le statut d'un signalement (Admin uniquement)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: report_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du signalement
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, reviewed, resolved]
 *     responses:
 *       200:
 *         description: Statut de la réclamation mis à jour
 *       400:
 *         description: Statut invalide
 *       403:
 *         description: Accès réservé aux administrateurs
 *       404:
 *         description: Réclamation introuvable
 *       500:
 *         description: Erreur serveur
 */
router.put("/admin/update/:report_id", authMiddleware, async (req, res) => {
    try {
        if (req.user.user_type !== "admin") {
            return res.status(403).json({ message: "Accès refusé. Seuls les administrateurs peuvent modifier les signalements." });
        }

        const { status } = req.body;
        const { report_id } = req.params;

        const allowedStatuses = ["pending", "reviewed", "resolved"];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ message: "Statut invalide." });
        }

        // Vérifier que la réclamation existe
        const [report] = await db.query("SELECT report_id FROM issue_reports WHERE report_id = ?", [report_id]);
        if (report.length === 0) {
            return res.status(404).json({ message: "Réclamation introuvable." });
        }

        await db.query("UPDATE issue_reports SET status = ? WHERE report_id = ?", [status, report_id]);

        res.json({ message: `Statut de la réclamation mis à jour à '${status}'.` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
