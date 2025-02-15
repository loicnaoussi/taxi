const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const db = require("../config/db");

/**
 * @swagger
 * components:
 *   schemas:
 *     Settings:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         base_fare:
 *           type: number
 *           example: 5.00
 *         cost_per_km:
 *           type: number
 *           example: 1.50
 *         max_distance_km:
 *           type: integer
 *           example: 100
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/settings:
 *   get:
 *     summary: Récupérer les paramètres de l'application
 *     tags: [Paramètres]
 *     responses:
 *       200:
 *         description: Paramètres de l'application récupérés avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Settings'
 *       404:
 *         description: Aucun paramètre trouvé
 *       500:
 *         description: Erreur serveur
 */
router.get("/", async (req, res) => {
    try {
        const [settings] = await db.query("SELECT * FROM settings LIMIT 1");

        if (settings.length === 0) {
            return res.status(404).json({ message: "Aucun paramètre trouvé." });
        }

        res.status(200).json(settings[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/settings/update:
 *   put:
 *     summary: Modifier les paramètres de l'application (Admin uniquement)
 *     tags: [Paramètres]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               base_fare:
 *                 type: number
 *                 example: 6.00
 *               cost_per_km:
 *                 type: number
 *                 example: 1.80
 *               max_distance_km:
 *                 type: integer
 *                 example: 150
 *     responses:
 *       200:
 *         description: Paramètres mis à jour avec succès
 *       403:
 *         description: Accès refusé (seuls les administrateurs peuvent modifier les paramètres)
 *       500:
 *         description: Erreur serveur
 */
router.put("/update", authMiddleware, async (req, res) => {
    try {
        if (req.user.user_type !== "admin") {
            return res.status(403).json({ message: "Seuls les administrateurs peuvent modifier les paramètres." });
        }

        const { base_fare, cost_per_km, max_distance_km } = req.body;

        await db.query(
            "UPDATE settings SET base_fare = ?, cost_per_km = ?, max_distance_km = ?, updated_at = NOW()",
            [base_fare, cost_per_km, max_distance_km]
        );

        res.status(200).json({ message: "Paramètres mis à jour avec succès !" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
