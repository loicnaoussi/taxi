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
 * /api/protected/profile:
 *   get:
 *     summary: Récupérer les informations de profil de l'utilisateur connecté
 *     tags: [Routes Protégées]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Informations de l'utilisateur
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Accès autorisé à l'espace protégé.
 *                 user:
 *                   type: object
 *                   properties:
 *                     user_id:
 *                       type: integer
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *                     phone_number:
 *                       type: string
 *                     full_name:
 *                       type: string
 *                     user_type:
 *                       type: string
 *                       enum: [admin, passenger, driver]
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: Utilisateur non trouvé
 *       500:
 *         description: Erreur serveur
 */

router.get("/profile", authMiddleware, async (req, res) => {
    try {
        // Récupérer les informations de l'utilisateur sans les champs sensibles
        const [user] = await db.query(
            "SELECT user_id, username, email, phone_number, full_name, user_type, created_at FROM users WHERE user_id = ?",
            [req.user.user_id]
        );

        if (user.length === 0) {
            return res.status(404).json({ status: "error", message: "Utilisateur non trouvé." });
        }

        res.json({
            status: "success",
            message: "Accès autorisé à l'espace protégé.",
            user: user[0],
        });
    } catch (error) {
        res.status(500).json({ status: "error", message: "Erreur serveur.", error: error.message });
    }
});

/**
 * @swagger
 * /api/protected:
 *   get:
 *     summary: Vérifier l'accès à une route protégée
 *     tags: [Routes Protégées]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Accès réussi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Bienvenue dans la route protégée !
 */
router.get("/", authMiddleware, (req, res) => {
    res.json({ status: "success", message: "Bienvenue dans la route protégée !" });
});

module.exports = router;
