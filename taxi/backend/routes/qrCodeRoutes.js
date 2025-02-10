const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const db = require("../config/db");
const QRCode = require("qrcode");

// 🔹 1. Générer un QR Code pour un utilisateur
router.post("/validate", authMiddleware, async (req, res) => {
    console.log("Données reçues :", req.body); // 🔹 Debugging

    const { qr_code } = req.body;

    if (!qr_code) {
        return res.status(400).json({ message: "Le QR Code est requis." });
    }

    try {
        const [user] = await db.query("SELECT user_id FROM qr_codes WHERE qr_data = ?", [qr_code]);

        if (user.length === 0) {
            return res.status(404).json({ message: "QR Code invalide." });
        }

        res.json({ message: "QR Code valide.", user_id: user[0].user_id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🔹 2. Récupérer le QR Code d’un utilisateur
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

// 🔹 3. Scanner un QR Code pour valider un utilisateur
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
