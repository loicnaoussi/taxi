const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const db = require("../config/db");

// 📌 Générer et récupérer un QR Code pour un utilisateur
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

// 📌 Vérifier un QR Code
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
