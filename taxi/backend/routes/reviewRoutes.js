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
 * /api/reviews/add:
 *   post:
 *     summary: Ajouter un avis sur un trajet
 *     tags: [Avis]
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
 *                 example: 123
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 5
 *               comment:
 *                 type: string
 *                 example: "Trajet agréable, chauffeur sympathique."
 *     responses:
 *       201:
 *         description: Avis ajouté avec succès
 *       400:
 *         description: Champs requis manquants ou note invalide
 *       500:
 *         description: Erreur serveur
 */

router.post("/add", authMiddleware, async (req, res) => {
    try {
        const { ride_id, rating, comment } = req.body;

        if (!ride_id || !rating || rating < 1 || rating > 5) {
            return res.status(400).json({ message: "Le trajet et une note entre 1 et 5 sont requis." });
        }

        await db.query(
            "INSERT INTO reviews (ride_id, reviewer_id, rating, comment) VALUES (?, ?, ?, ?)",
            [ride_id, req.user.user_id, rating, comment || ""]
        );

        res.status(201).json({ message: "Avis ajouté avec succès !" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/reviews/my-reviews:
 *   get:
 *     summary: Voir les avis reçus par l'utilisateur
 *     tags: [Avis]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des avis reçus
 *       500:
 *         description: Erreur serveur
 */
router.get("/my-reviews", authMiddleware, async (req, res) => {
    try {
        const [reviews] = await db.query(
            `SELECT r.review_id, r.ride_id, r.rating, r.comment, u.username AS reviewer 
             FROM reviews r 
             JOIN users u ON r.reviewer_id = u.user_id 
             JOIN rides ride ON r.ride_id = ride.ride_id 
             WHERE ride.passenger_id = ? OR ride.driver_id = ?`,
            [req.user.user_id, req.user.user_id]
        );

        res.json(reviews);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/reviews/delete/{review_id}:
 *   delete:
 *     summary: Supprimer un avis laissé par l'utilisateur
 *     tags: [Avis]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: review_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de l'avis à supprimer
 *     responses:
 *       200:
 *         description: Avis supprimé avec succès
 *       404:
 *         description: Avis non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.delete("/delete/:review_id", authMiddleware, async (req, res) => {
    try {
        const { review_id } = req.params;

        const [result] = await db.query(
            "DELETE FROM reviews WHERE review_id = ? AND reviewer_id = ?",
            [review_id, req.user.user_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Avis non trouvé." });
        }

        res.json({ message: "Avis supprimé avec succès." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
