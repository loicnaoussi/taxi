const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const db = require("../config/db");

// 🔹 1. Enregistrer un paiement pour un trajet
router.post("/pay", authMiddleware, async (req, res) => {
    try {
        const { ride_id, amount, payment_method } = req.body;

        if (!ride_id || !amount || !payment_method) {
            return res.status(400).json({ message: "Tous les champs sont requis." });
        }

        // Vérifier si le trajet existe
        const [ride] = await db.query("SELECT * FROM rides WHERE ride_id = ?", [ride_id]);

        if (ride.length === 0) {
            return res.status(404).json({ message: "Trajet non trouvé." });
        }

        // Enregistrer le paiement
        const [result] = await db.query(
            "INSERT INTO payments (ride_id, amount, payment_method, payment_status) VALUES (?, ?, ?, 'pending')",
            [ride_id, amount, payment_method]
        );

        res.status(201).json({ message: "Paiement enregistré avec succès !", payment_id: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🔹 2. Récupérer tous les paiements d'un utilisateur
router.get("/my-payments", authMiddleware, async (req, res) => {
    try {
        const [payments] = await db.query("SELECT * FROM payments WHERE ride_id IN (SELECT ride_id FROM rides WHERE passenger_id = ?)", [req.user.user_id]);

        res.json(payments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🔹 3. Mettre à jour le statut d'un paiement
router.post("/update/:payment_id", authMiddleware, async (req, res) => {
    try {
        const { payment_status } = req.body;
        const { payment_id } = req.params;

        const allowedStatuses = ["pending", "completed", "failed"];
        if (!allowedStatuses.includes(payment_status)) {
            return res.status(400).json({ message: "Statut invalide." });
        }

        await db.query("UPDATE payments SET payment_status = ? WHERE payment_id = ?", [payment_status, payment_id]);

        res.json({ message: `Statut du paiement mis à jour à '${payment_status}'.` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
