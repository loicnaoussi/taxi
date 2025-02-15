const express = require("express");
const router = express.Router();
const db = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

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
 * /api/location/{userId}:
 *   get:
 *     summary: Récupérer la position d'un utilisateur
 *     tags: [Location]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de l'utilisateur
 *     responses:
 *       200:
 *         description: Position de l'utilisateur récupérée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 latitude:
 *                   type: number
 *                 longitude:
 *                   type: number
 *                 last_updated:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Aucune position trouvée pour cet utilisateur
 *       403:
 *         description: Non autorisé (JWT manquant ou invalide)
 *       500:
 *         description: Erreur serveur
 */
router.get("/:userId", authMiddleware, async (req, res) => {
    try {
        const { userId } = req.params;

        // Récupérer la position de l'utilisateur
        const [location] = await db.query(
            "SELECT latitude, longitude, last_updated FROM user_location WHERE user_id = ?",
            [userId]
        );

        if (location.length === 0) {
            return res.status(404).json({ message: "Aucune position trouvée pour cet utilisateur." });
        }

        res.status(200).json(location[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
