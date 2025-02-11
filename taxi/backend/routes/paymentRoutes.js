const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const db = require("../config/db");

// 📌 Effectuer un paiement
router.post("/pay", authMiddleware, async (req, res) => {
    try {
        const { ride_id, amount, payment_method } = req.body;

        if (!ride_id || !amount || !payment_method) {
            return res.status(400).json({ message: "Tous les champs sont requis." });
        }

        await db.query(
            "INSERT INTO payments (ride_id, amount, payment_method, payment_status) VALUES (?, ?, ?, 'completed')",
            [ride_id, amount, payment_method]
        );

        res.status(201).json({ message: "Paiement effectué avec succès !" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 📌 Voir les paiements d'un utilisateur
router.get("/my-payments", authMiddleware, async (req, res) => {
    try {
        const [payments] = await db.query(
            "SELECT * FROM payments WHERE ride_id IN (SELECT ride_id FROM rides WHERE passenger_id = ? OR driver_id = ?)",
            [req.user.user_id, req.user.user_id]
        );

        res.json(payments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
