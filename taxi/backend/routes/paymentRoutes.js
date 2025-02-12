const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const db = require("../config/db");

// 📌 Modes de paiement valides
const validPaymentMethods = ["cash", "credit_card", "mobile_payment"];

// 📌 Effectuer un paiement
router.post("/process", authMiddleware, async (req, res) => {
    try {
        const { ride_id, amount, payment_method } = req.body;

        // 🔹 Vérification des champs obligatoires
        if (!ride_id || !amount || !payment_method) {
            return res.status(400).json({ message: "Tous les champs sont requis." });
        }

        // 🔹 Vérification du mode de paiement
        if (!validPaymentMethods.includes(payment_method)) {
            return res.status(400).json({ message: "Méthode de paiement invalide." });
        }

        // 🔹 Vérification de l'existence du trajet
        const [ride] = await db.query("SELECT * FROM rides WHERE ride_id = ?", [ride_id]);
        if (ride.length === 0) {
            return res.status(404).json({ message: "Trajet introuvable." });
        }

        // 🔹 Insertion du paiement avec statut 'pending'
        const [result] = await db.query(
            "INSERT INTO payments (ride_id, amount, payment_method, payment_status) VALUES (?, ?, ?, 'pending')",
            [ride_id, amount, payment_method]
        );

        // 🔹 Récupération de l'ID du paiement inséré
        const payment_id = result.insertId;

        res.status(201).json({ message: "Paiement enregistré avec succès !", payment_id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 📌 Récupérer un paiement spécifique
router.get("/:payment_id", authMiddleware, async (req, res) => {
    try {
        const { payment_id } = req.params;

        const [payment] = await db.query("SELECT * FROM payments WHERE payment_id = ?", [payment_id]);

        if (payment.length === 0) {
            return res.status(404).json({ message: "Paiement non trouvé." });
        }

        res.json(payment[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 📌 Voir l'historique des paiements d'un utilisateur
router.get("/history", authMiddleware, async (req, res) => {
    try {
        const [payments] = await db.query(
            "SELECT * FROM payments WHERE ride_id IN (SELECT ride_id FROM rides WHERE passenger_id = ? OR driver_id = ?)",
            [req.user.user_id, req.user.user_id]
        );

        if (payments.length === 0) {
            return res.status(404).json({ message: "Aucun paiement trouvé." });
        }

        res.json({ total: payments.length, payments });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 📌 Mettre à jour le statut d'un paiement
router.put("/:payment_id/update-status", authMiddleware, async (req, res) => {
    try {
        const { payment_id } = req.params;
        const { payment_status } = req.body;

        if (!["pending", "completed", "failed"].includes(payment_status)) {
            return res.status(400).json({ message: "Statut de paiement invalide." });
        }

        const [updateResult] = await db.query(
            "UPDATE payments SET payment_status = ? WHERE payment_id = ?",
            [payment_status, payment_id]
        );

        if (updateResult.affectedRows === 0) {
            return res.status(404).json({ message: "Paiement non trouvé." });
        }

        res.json({ message: "Statut du paiement mis à jour avec succès." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
