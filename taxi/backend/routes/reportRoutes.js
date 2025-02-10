const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const db = require("../config/db");

// 🔹 1. Obtenir les statistiques générales (Admin uniquement)
router.get("/stats", authMiddleware, async (req, res) => {
    try {
        if (req.user.user_type !== "admin") {
            return res.status(403).json({ message: "Accès refusé. Seuls les administrateurs peuvent voir les statistiques." });
        }

        const [totalUsers] = await db.query("SELECT COUNT(*) AS total_users FROM users");
        const [totalRides] = await db.query("SELECT COUNT(*) AS total_rides FROM rides");
        const [totalRevenue] = await db.query("SELECT SUM(amount) AS total_revenue FROM payments WHERE payment_status = 'completed'");

        res.json({
            total_users: totalUsers[0].total_users,
            total_rides: totalRides[0].total_rides,
            total_revenue: totalRevenue[0].total_revenue || 0
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🔹 2. Obtenir les revenus des paiements (Admin uniquement)
router.get("/revenues", authMiddleware, async (req, res) => {
    try {
        if (req.user.user_type !== "admin") {
            return res.status(403).json({ message: "Accès refusé. Seuls les administrateurs peuvent voir les revenus." });
        }

        const [revenues] = await db.query(`
            SELECT DATE(created_at) AS date, SUM(amount) AS revenue
            FROM payments
            WHERE payment_status = 'completed'
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        `);

        res.json(revenues);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🔹 3. Obtenir le nombre d'utilisateurs actifs par rôle (Admin uniquement)
router.get("/active-users", authMiddleware, async (req, res) => {
    try {
        if (req.user.user_type !== "admin") {
            return res.status(403).json({ message: "Accès refusé. Seuls les administrateurs peuvent voir ces données." });
        }

        const [activeUsers] = await db.query(`
            SELECT user_type, COUNT(*) AS count
            FROM users
            GROUP BY user_type
        `);

        res.json(activeUsers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
