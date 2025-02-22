const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const db = require("../config/db");

/**
 * @swagger
 * /api/admin/dashboard:
 *   get:
 *     summary: Récupérer les statistiques du tableau de bord
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     description: Retourne les statistiques clés pour l'administration, uniquement accessible aux admins.
 *     responses:
 *       200:
 *         description: Statistiques récupérées avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalUsers:
 *                   type: integer
 *                   description: Nombre total d'utilisateurs
 *                 totalRides:
 *                   type: integer
 *                   description: Nombre total de trajets
 *                 completedRides:
 *                   type: integer
 *                   description: Nombre total de trajets complétés
 *                 pendingPayments:
 *                   type: integer
 *                   description: Nombre total de paiements en attente
 *                 totalEarnings:
 *                   type: number
 *                   description: Total des revenus des paiements complétés
 *       403:
 *         description: Accès refusé. Admin uniquement.
 *       500:
 *         description: Erreur interne du serveur
 */
router.get("/dashboard", authMiddleware, async (req, res) => {
    try {
        // Vérification si l'utilisateur est admin
        if (req.user.user_type !== "admin") {
            return res.status(403).json({ message: "Accès refusé. Admin uniquement." });
        }

        // 📌 Récupération des statistiques globales
        const [[totalUsers]] = await db.query("SELECT COUNT(*) AS count FROM users");
        const [[totalRides]] = await db.query("SELECT COUNT(*) AS count FROM rides");
        const [[completedRides]] = await db.query("SELECT COUNT(*) AS count FROM rides WHERE status = 'completed'");
        const [[pendingPayments]] = await db.query("SELECT COUNT(*) AS count FROM payments WHERE payment_status = 'pending'");
        const [[totalEarnings]] = await db.query("SELECT SUM(amount) AS total FROM payments WHERE payment_status = 'completed'");

        res.json({
            totalUsers: totalUsers.count,
            totalRides: totalRides.count,
            completedRides: completedRides.count,
            pendingPayments: pendingPayments.count,
            totalEarnings: totalEarnings.total || 0
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
