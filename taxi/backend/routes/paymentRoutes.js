const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const db = require("../config/db");

// 📌 Modes de paiement valides
const validPaymentMethods = ["cash", "credit_card", "mobile_payment"];

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
 * /api/payments/pay:
 *   post:
 *     summary: Effectuer un paiement
 *     tags: [Paiements]
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
 *                 description: ID du trajet
 *               amount:
 *                 type: number
 *                 format: float
 *                 description: Montant du paiement
 *               payment_method:
 *                 type: string
 *                 enum: [cash, credit_card, mobile_payment]
 *                 description: Mode de paiement
 *     responses:
 *       200:
 *         description: Paiement effectué avec succès
 *       400:
 *         description: Erreur de validation
 *       500:
 *         description: Erreur serveur
 */
router.post("/pay", authMiddleware, async (req, res) => {
    try {
        const { ride_id, amount, payment_method } = req.body;

        if (!ride_id || !amount || !payment_method) {
            return res.status(400).json({ message: "Tous les champs sont requis." });
        }

        if (!validPaymentMethods.includes(payment_method)) {
            return res.status(400).json({ message: "Méthode de paiement invalide." });
        }

        const [ride] = await db.query("SELECT * FROM rides WHERE ride_id = ?", [ride_id]);
        if (ride.length === 0) {
            return res.status(200).json({ message: "Aucun trajet trouvé. Paiement ignoré." });
        }

        const [result] = await db.query(
            "INSERT INTO payments (ride_id, amount, payment_method, payment_status) VALUES (?, ?, ?, 'completed')",
            [ride_id, amount, payment_method]
        );

        res.status(200).json({ 
            message: "Paiement effectué avec succès !", 
            payment_id: result.insertId 
        });
    } catch (error) {
        console.error("🚨 Erreur lors du paiement :", error);
        res.status(500).json({ error: "Erreur interne du serveur." });
    }
});

/**
 * @swagger
 * /api/payments/{payment_id}:
 *   get:
 *     summary: Récupérer les détails d'un paiement
 *     tags: [Paiements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: payment_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du paiement
 *     responses:
 *       200:
 *         description: Détails du paiement
 *       404:
 *         description: Paiement non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.get("/:payment_id", authMiddleware, async (req, res) => {
    try {
        const { payment_id } = req.params;

        const [payment] = await db.query("SELECT * FROM payments WHERE payment_id = ?", [payment_id]);

        if (payment.length === 0) {
            return res.status(200).json({ message: "Aucun paiement trouvé." });
        }

        res.status(200).json(payment[0]);
    } catch (error) {
        console.error("🚨 Erreur lors de la récupération du paiement :", error);
        res.status(500).json({ error: "Erreur interne du serveur." });
    }
});

/**
 * @swagger
 * /api/payments/history:
 *   get:
 *     summary: Récupérer l'historique des paiements de l'utilisateur
 *     tags: [Paiements]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Historique des paiements
 *       404:
 *         description: Aucun paiement trouvé
 *       500:
 *         description: Erreur serveur
 */
router.get("/history", authMiddleware, async (req, res) => {
    try {
        const [payments] = await db.query(
            "SELECT * FROM payments WHERE ride_id IN (SELECT ride_id FROM rides WHERE passenger_id = ? OR driver_id = ?)",
            [req.user.user_id, req.user.user_id]
        );

        res.status(200).json({
            total: payments.length,
            payments: payments.length ? payments : "Aucun paiement trouvé."
        });
    } catch (error) {
        console.error("🚨 Erreur lors de l'historique des paiements :", error);
        res.status(500).json({ error: "Erreur interne du serveur." });
    }
});

/**
 * @swagger
 * /api/payments/{payment_id}/update-status:
 *   put:
 *     summary: Mettre à jour le statut d'un paiement
 *     tags: [Paiements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: payment_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du paiement
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               payment_status:
 *                 type: string
 *                 enum: [pending, completed, failed]
 *                 description: Statut de paiement
 *     responses:
 *       200:
 *         description: Statut du paiement mis à jour avec succès
 *       400:
 *         description: Statut invalide
 *       404:
 *         description: Paiement non trouvé
 *       500:
 *         description: Erreur serveur
 */
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
            return res.status(200).json({ message: "Aucun paiement trouvé. Aucun changement effectué." });
        }

        res.status(200).json({ message: "Statut du paiement mis à jour avec succès." });
    } catch (error) {
        console.error("🚨 Erreur lors de la mise à jour du paiement :", error);
        res.status(500).json({ error: "Erreur interne du serveur." });
    }
});

module.exports = router;
