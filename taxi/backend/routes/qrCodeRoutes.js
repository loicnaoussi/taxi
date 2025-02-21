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
 * /api/qrcodes/my-qrcode:
 *   get:
 *     summary: Récupérer le QR Code de l'utilisateur
 *     tags: [QR Codes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: QR Code récupéré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 qr_code:
 *                   type: string
 *                   example: "QR123456789"
 *       404:
 *         description: Aucun QR Code trouvé
 *       500:
 *         description: Erreur serveur
 */
router.get("/my-qrcode", authMiddleware, async (req, res) => {
    try {
        const [rows] = await db.query("SELECT qr_data FROM qr_codes WHERE user_id = ?", [req.user.user_id]);

        if (rows.length === 0) {
            // Génération d'un QR Code à 6 chiffres précédé de "QR"
            const newCode = "QR" + (Math.floor(Math.random() * 900000) + 100000);
            // Insérer le nouveau QR Code dans la base de données pour cet utilisateur
            await db.query("INSERT INTO qr_codes (user_id, qr_data) VALUES (?, ?)", [req.user.user_id, newCode]);
            return res.json({ qr_code: newCode });
        }

        res.json({ qr_code: rows[0].qr_data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/qrcodes/validate:
 *   post:
 *     summary: Vérifier la validité d'un QR Code
 *     tags: [QR Codes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               qr_code:
 *                 type: string
 *                 example: "QR123456789"
 *     responses:
 *       200:
 *         description: QR Code valide
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "QR Code valide."
 *                 user_id:
 *                   type: integer
 *                   example: 123
 *       400:
 *         description: Le QR Code est requis
 *       404:
 *         description: QR Code invalide
 *       500:
 *         description: Erreur serveur
 */

/**
 * @swagger
 * /api/qrcodes/update:
 *   post:
 *     summary: Mettre à jour le QR Code de l'utilisateur
 *     tags: [QR Codes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               qr_code:
 *                 type: string
 *                 example: "QR654321"
 *     responses:
 *       200:
 *         description: QR Code mis à jour avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "QR Code mis à jour avec succès"
 *       400:
 *         description: "QR Code requis ou non valide"
 *       500:
 *         description: Erreur serveur
 */
router.post("/update", authMiddleware, async (req, res) => {
    try {
        const { qr_code } = req.body;
        if (!qr_code) {
            return res.status(400).json({ message: "Le QR Code est requis." });
        }
        // Update the existing QR code for the user
        const [result] = await db.query("UPDATE qr_codes SET qr_data = ? WHERE user_id = ?", [qr_code, req.user.user_id]);
        // If no row was affected, perhaps the user did not have a QR code yet
        if (result.affectedRows === 0) {
            // Optionally insert if not exists:
            await db.query("INSERT INTO qr_codes (user_id, qr_data) VALUES (?, ?)", [req.user.user_id, qr_code]);
        }
        res.json({ message: "QR Code mis à jour avec succès" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post("/validate", authMiddleware, async (req, res) => {
    try {
        const { qr_code } = req.body;

        if (!qr_code) {
            return res.status(400).json({ message: "Le QR Code est requis." });
        }

        const [user] = await db.query("SELECT user_id FROM qr_codes WHERE qr_data = ?", [qr_code]);

        if (user.length === 0) {
            return res.status(404).json({ message: "QR Code invalide." });
        }

        res.json({ message: "QR Code valide.", user_id: user[0].user_id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
