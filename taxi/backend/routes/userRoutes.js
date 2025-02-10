const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const db = require("../config/db");
const multer = require("multer");
const fs = require("fs");

// Configuration de l'upload des images de profil


// 📌 Vérifie si le dossier `uploads/` existe, sinon le créer
const uploadDir = "uploads/";
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// 📌 Configuration du stockage des fichiers
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir); // 📂 Stocke les images dans le dossier `uploads/`
    },
    filename: function (req, file, cb) {
        cb(null, req.user.user_id + "_" + Date.now() + "_" + file.originalname);
    },
});
const upload = multer({ storage: storage });



// 🔹 1. Récupérer les informations du profil
router.get("/profile", authMiddleware, async (req, res) => {
    try {
        const [user] = await db.query(
            "SELECT user_id, username, email, full_name, phone_number, profile_image_url, user_type FROM users WHERE user_id = ?",
            [req.user.user_id]
        );

        if (user.length === 0) {
            return res.status(404).json({ message: "Utilisateur non trouvé." });
        }

        res.json(user[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🔹 2. Mettre à jour les informations utilisateur
router.put("/update", authMiddleware, async (req, res) => {
    try {
        const { username, full_name, phone_number } = req.body;

        await db.query(
            "UPDATE users SET username = ?, full_name = ?, phone_number = ? WHERE user_id = ?",
            [username, full_name, phone_number, req.user.user_id]
        );

        res.json({ message: "Profil mis à jour avec succès !" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🔹 3. Mettre à jour la photo de profil
router.post("/upload-photo", authMiddleware, upload.single("profile_image"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "Aucune image envoyée." });
        }

        // Générer le lien complet en local
        const baseUrl = `${req.protocol}://${req.get("host")}`;
        const imageUrl = `${baseUrl}/uploads/${req.file.filename}`;

        // Mettre à jour la BDD avec l'URL complet
        await db.query("UPDATE users SET profile_image_url = ? WHERE user_id = ?", [imageUrl, req.user.user_id]);

        res.json({ message: "Photo de profil mise à jour avec succès !", profile_image_url: imageUrl });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


module.exports = router;
