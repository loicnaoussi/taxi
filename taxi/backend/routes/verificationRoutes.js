const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const db = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

// 📌 Configuration de Multer pour gérer les fichiers (vidéos et images)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, "../uploads/verifications");
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage });

// 📌 Vérification d’identité (vidéo et CNI)
router.post(
    "/upload-verification",
    authMiddleware,
    upload.fields([
        { name: "verification_video", maxCount: 1 },
        { name: "cni_front", maxCount: 1 },
        { name: "cni_back", maxCount: 1 }
    ]),
    async (req, res) => {
        try {
            const userId = req.user.user_id;

            if (!req.files["verification_video"] || !req.files["cni_front"] || !req.files["cni_back"]) {
                return res.status(400).json({ message: "Tous les fichiers sont requis." });
            }

            const verificationVideo = req.files["verification_video"][0].filename;
            const cniFront = req.files["cni_front"][0].filename;
            const cniBack = req.files["cni_back"][0].filename;

            await db.query(
                "INSERT INTO user_verifications (user_id, verification_video, cni_front, cni_back, status) VALUES (?, ?, ?, ?, 'pending')",
                [userId, verificationVideo, cniFront, cniBack]
            );

            res.status(201).json({ message: "Vérification soumise avec succès. En attente de validation." });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
);

module.exports = router;
