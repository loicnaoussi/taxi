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
 * /api/history/my-rides:
 *   get:
 *     summary: Voir l'historique des trajets (passager ou chauffeur)
 *     tags: [History]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des trajets
 *       500:
 *         description: Erreur serveur
 */
router.get("/my-rides", authMiddleware, async (req, res) => {
    try {
        const [rides] = await db.query(
            "SELECT ride_id, pickup_location, dropoff_location, status, created_at FROM rides WHERE passenger_id = ? OR driver_id = ? ORDER BY created_at DESC LIMIT 50",
            [req.user.user_id, req.user.user_id]
        );

        res.json({ total: rides.length, rides });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/history/ride/{ride_id}:
 *   get:
 *     summary: Récupérer les détails d'un trajet spécifique
 *     tags: [History]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ride_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du trajet
 *     responses:
 *       200:
 *         description: Détails du trajet
 *       404:
 *         description: Trajet non trouvé ou non accessible
 *       500:
 *         description: Erreur serveur
 */
router.get("/ride/:ride_id", authMiddleware, async (req, res) => {
    try {
        const { ride_id } = req.params;
        const [ride] = await db.query(
            "SELECT ride_id, passenger_id, driver_id, pickup_location, dropoff_location, status, created_at FROM rides WHERE ride_id = ? AND (passenger_id = ? OR driver_id = ?)",
            [ride_id, req.user.user_id, req.user.user_id]
        );

        if (ride.length === 0) {
            return res.status(404).json({ message: "Trajet non trouvé ou non accessible." });
        }

        res.json(ride[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/history/actions/my-history:
 *   get:
 *     summary: Voir l'historique des actions d'un utilisateur
 *     tags: [History]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des actions
 *       500:
 *         description: Erreur serveur
 */
router.get("/actions/my-history", authMiddleware, async (req, res) => {
    try {
        const [history] = await db.query(
            "SELECT history_id, action_type, details, timestamp FROM history WHERE user_id = ? ORDER BY timestamp DESC LIMIT 50",
            [req.user.user_id]
        );

        res.json({ total: history.length, history });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/history/actions/admin/history:
 *   get:
 *     summary: Voir tout l'historique des actions (Admin uniquement)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste de toutes les actions
 *       403:
 *         description: Accès réservé aux administrateurs
 *       500:
 *         description: Erreur serveur
 */
router.get("/actions/admin/history", authMiddleware, async (req, res) => {
    try {
        if (req.user.user_type !== "admin") {
            return res.status(403).json({ message: "Accès réservé aux administrateurs." });
        }

        const [history] = await db.query(
            "SELECT history_id, user_id, ride_id, action_type, details, timestamp FROM history ORDER BY timestamp DESC LIMIT 100"
        );

        res.json({ total: history.length, history });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/history/actions/admin/user/{user_id}:
 *   get:
 *     summary: Voir l'historique des actions d'un utilisateur spécifique (Admin)
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
 *         description: Liste des actions de l'utilisateur
 *       403:
 *         description: Accès réservé aux administrateurs
 *       500:
 *         description: Erreur serveur
 */
router.get("/actions/admin/user/:user_id", authMiddleware, async (req, res) => {
    try {
        if (req.user.user_type !== "admin") {
            return res.status(403).json({ message: "Accès réservé aux administrateurs." });
        }

        const { user_id } = req.params;
        const [history] = await db.query(
            "SELECT history_id, ride_id, action_type, details, timestamp FROM history WHERE user_id = ? ORDER BY timestamp DESC LIMIT 50",
            [user_id]
        );

        res.json({ total: history.length, history });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
