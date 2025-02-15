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
        const [qrCode] = await db.query("SELECT qr_data FROM qr_codes WHERE user_id = ?", [req.user.user_id]);

        if (qrCode.length === 0) {
            return res.status(404).json({ message: "Aucun QR Code trouvé." });
        }

        res.json({ qr_code: qrCode[0].qr_data });
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
