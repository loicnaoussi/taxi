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
 * /api/rides/create:
 *   post:
 *     summary: Créer un trajet (Passager uniquement)
 *     tags: [Trajets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               pickup_location:
 *                 type: string
 *                 example: "Paris"
 *               dropoff_location:
 *                 type: string
 *                 example: "Lyon"
 *               fare:
 *                 type: number
 *                 example: 50.00
 *     responses:
 *       201:
 *         description: Trajet créé avec succès
 *       403:
 *         description: Seuls les passagers peuvent créer des trajets
 *       500:
 *         description: Erreur serveur
 */
router.post("/create", authMiddleware, async (req, res) => {
    const { pickup_location, dropoff_location, fare } = req.body;

    if (!pickup_location || !dropoff_location || !fare) {
        return res.status(400).json({ message: "Tous les champs sont requis." });
    }

    if (req.user.user_type !== "passenger") {
        return res.status(403).json({ message: "Seuls les passagers peuvent créer des trajets." });
    }

    try {
        const [result] = await db.query(
            "INSERT INTO rides (passenger_id, pickup_location, dropoff_location, status, fare) VALUES (?, ?, ?, 'requested', ?)",
            [req.user.user_id, pickup_location, dropoff_location, fare]
        );

        res.status(201).json({ message: "Trajet créé avec succès !", ride_id: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/rides/accept/{ride_id}:
 *   post:
 *     summary: Accepter un trajet (Chauffeur uniquement)
 *     tags: [Trajets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ride_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du trajet à accepter
 *     responses:
 *       200:
 *         description: Trajet accepté avec succès
 *       400:
 *         description: Ce trajet n'est plus disponible
 *       403:
 *         description: Seuls les chauffeurs peuvent accepter des trajets
 *       404:
 *         description: Trajet non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.post("/accept/:ride_id", authMiddleware, async (req, res) => {
    if (req.user.user_type !== "driver") {
        return res.status(403).json({ message: "Seuls les chauffeurs peuvent accepter des trajets." });
    }

    const { ride_id } = req.params;

    try {
        const [ride] = await db.query("SELECT * FROM rides WHERE ride_id = ?", [ride_id]);
        if (ride.length === 0) return res.status(404).json({ message: "Trajet non trouvé." });

        if (ride[0].status !== "requested") {
            return res.status(400).json({ message: "Ce trajet n'est plus disponible." });
        }

        await db.query("UPDATE rides SET driver_id = ?, status = 'accepted' WHERE ride_id = ?", [
            req.user.user_id,
            ride_id,
        ]);

        res.json({ message: "Trajet accepté avec succès !" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/rides/cancel/{ride_id}:
 *   post:
 *     summary: Annuler un trajet (Passager ou Chauffeur)
 *     tags: [Trajets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ride_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du trajet à annuler
 *     responses:
 *       200:
 *         description: Trajet annulé avec succès
 *       403:
 *         description: Vous ne pouvez pas annuler ce trajet
 *       404:
 *         description: Trajet non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.post("/cancel/:ride_id", authMiddleware, async (req, res) => {
    const { ride_id } = req.params;

    try {
        const [ride] = await db.query("SELECT * FROM rides WHERE ride_id = ?", [ride_id]);

        if (ride.length === 0) {
            return res.status(404).json({ message: "Trajet non trouvé." });
        }

        if (ride[0].passenger_id !== req.user.user_id && ride[0].driver_id !== req.user.user_id) {
            return res.status(403).json({ message: "Vous ne pouvez pas annuler ce trajet." });
        }

        await db.query("UPDATE rides SET status = 'canceled' WHERE ride_id = ?", [ride_id]);

        res.status(200).json({ message: "Trajet annulé avec succès." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/rides/my-rides:
 *   get:
 *     summary: Voir les trajets de l'utilisateur connecté
 *     tags: [Trajets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des trajets de l'utilisateur
 *       500:
 *         description: Erreur serveur
 */
router.get("/my-rides", authMiddleware, async (req, res) => {
    try {
        const [rides] = await db.query(
            "SELECT ride_id, pickup_location, dropoff_location, status, created_at FROM rides WHERE passenger_id = ? OR driver_id = ? ORDER BY created_at DESC",
            [req.user.user_id, req.user.user_id]
        );

        res.json({ rides });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/rides/update-location:
 *   post:
 *     summary: Mettre à jour la position GPS du chauffeur
 *     tags: [Trajets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               latitude:
 *                 type: number
 *                 example: 48.8566
 *               longitude:
 *                 type: number
 *                 example: 2.3522
 *     responses:
 *       200:
 *         description: Position mise à jour avec succès
 *       400:
 *         description: Latitude et longitude sont requis
 *       403:
 *         description: Seuls les chauffeurs peuvent mettre à jour leur position
 *       500:
 *         description: Erreur serveur
 */
router.post("/update-location", authMiddleware, async (req, res) => {
    const { latitude, longitude } = req.body;
    const userId = req.user.user_id;

    if (req.user.user_type !== "driver") {
        return res.status(403).json({ message: "Seuls les chauffeurs peuvent mettre à jour leur position." });
    }

    if (!latitude || !longitude) {
        return res.status(400).json({ message: "Latitude et longitude sont requis." });
    }

    try {
        const [result] = await db.query(
            `INSERT INTO user_location (user_id, latitude, longitude, last_updated) 
             VALUES (?, ?, ?, NOW()) 
             ON DUPLICATE KEY UPDATE 
             latitude = VALUES(latitude), 
             longitude = VALUES(longitude), 
             last_updated = NOW()`,
            [userId, latitude, longitude]
        );

        if (result.affectedRows === 0) {
            return res.status(500).json({ message: "Échec de la mise à jour de la position." });
        }

        console.log(`📍 Position mise à jour pour user_id ${userId} : (${latitude}, ${longitude})`);
        res.status(200).json({ message: "Position mise à jour avec succès" });
    } catch (error) {
        console.error("🔥 Erreur lors de la mise à jour de la position :", error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/rides/location/{driver_id}:
 *   get:
 *     summary: Récupérer la position d’un chauffeur
 *     tags: [Trajets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: driver_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du chauffeur
 *     responses:
 *       200:
 *         description: Position trouvée
 *       404:
 *         description: Position non trouvée
 *       500:
 *         description: Erreur serveur
 */
router.get("/location/:driver_id", authMiddleware, async (req, res) => {
    const { driver_id } = req.params;

    try {
        const [location] = await db.query(
            `SELECT latitude, longitude, last_updated 
             FROM user_location 
             WHERE user_id = ?`,
            [driver_id]
        );

        if (location.length === 0) {
            console.warn(`⚠️ Aucune position trouvée pour le chauffeur user_id ${driver_id}`);
            return res.status(404).json({ message: "Position non trouvée." });
        }

        console.log(`📍 Position trouvée pour user_id ${driver_id} :`, location[0]);
        res.status(200).json(location[0]);
    } catch (error) {
        console.error("🔥 Erreur lors de la récupération de la position :", error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
