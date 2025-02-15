const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const db = require("../config/db");

/**
 * @swagger
 * components:
 *   schemas:
 *     UserLocation:
 *       type: object
 *       properties:
 *         user_id:
 *           type: integer
 *           example: 123
 *         latitude:
 *           type: number
 *           format: float
 *           example: 48.8566
 *         longitude:
 *           type: number
 *           format: float
 *           example: 2.3522
 *         last_updated:
 *           type: string
 *           format: date-time
 */

// ✅ Correction : On retourne le routeur sous forme de fonction avec `io` en paramètre
module.exports = (io) => {
    const router = express.Router();

    /**
     * @swagger
     * /api/user-locations/update:
     *   post:
     *     summary: Mettre à jour la position d'un utilisateur (chauffeur)
     *     tags: [Localisations]
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
     *                 format: float
     *                 example: 48.8566
     *               longitude:
     *                 type: number
     *                 format: float
     *                 example: 2.3522
     *     responses:
     *       200:
     *         description: Position mise à jour avec succès
     *       400:
     *         description: Latitude et longitude sont requises
     *       500:
     *         description: Erreur serveur
     */
    router.post("/update", authMiddleware, async (req, res) => {
        try {
            const { latitude, longitude } = req.body;
            const userId = req.user.user_id;

            if (!latitude || !longitude) {
                return res.status(400).json({ message: "Latitude et longitude sont requises." });
            }

            // Mettre à jour la position dans la base de données
            await db.query(
                "INSERT INTO user_location (user_id, latitude, longitude, last_updated) VALUES (?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE latitude = VALUES(latitude), longitude = VALUES(longitude), last_updated = NOW()",
                [userId, latitude, longitude]
            );

            // Émettre la nouvelle position via WebSockets
            if (io) {
                io.emit("location_update", { userId, latitude, longitude });
            }

            res.status(200).json({ message: "Position mise à jour avec succès." });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * @swagger
     * /api/user-locations/driver/{driver_id}:
     *   get:
     *     summary: Récupérer la position d'un chauffeur en temps réel
     *     tags: [Localisations]
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
     *         description: Position du chauffeur
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/UserLocation'
     *       404:
     *         description: Localisation introuvable
     *       500:
     *         description: Erreur serveur
     */
    router.get("/driver/:driver_id", authMiddleware, async (req, res) => {
        try {
            const { driver_id } = req.params;
            const [location] = await db.query(
                "SELECT latitude, longitude, last_updated FROM user_location WHERE user_id = ?",
                [driver_id]
            );

            if (location.length === 0) {
                return res.status(404).json({ message: "Localisation introuvable pour ce chauffeur." });
            }

            res.status(200).json(location[0]);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    return router; // ✅ Correction : Retourner le routeur correctement
};
