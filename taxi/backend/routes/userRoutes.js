const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const db = require("../config/db");
const multer = require("multer");
const fs = require("fs");

// 📌 Vérifie si le dossier `uploads/` existe, sinon le créer
const uploadDir = "uploads/";
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// 📌 Configuration du stockage des fichiers avec validation
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, req.user.user_id + "_" + Date.now() + "_" + file.originalname);
    },
});
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 🔹 Limite à 5MB
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith("image/")) {
            return cb(new Error("Seuls les fichiers images sont autorisés !"), false);
        }
        cb(null, true);
    },
});

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         user_id:
 *           type: integer
 *         username:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         full_name:
 *           type: string
 *         phone_number:
 *           type: string
 *         profile_image_url:
 *           type: string
 *           format: uri
 *         user_type:
 *           type: string
 *           enum: [passenger, driver, admin]
 */

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Récupérer les informations du profil
 *     tags: [Utilisateurs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Informations de l'utilisateur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: Utilisateur non trouvé
 *       500:
 *         description: Erreur serveur
 */
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

/**
 * @swagger
 * /api/users/update:
 *   put:
 *     summary: Mettre à jour les informations utilisateur
 *     tags: [Utilisateurs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               full_name:
 *                 type: string
 *               phone_number:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profil mis à jour avec succès
 *       400:
 *         description: Erreur de validation
 *       500:
 *         description: Erreur serveur
 */
router.put("/update", authMiddleware, async (req, res) => {
    try {
        const { username, full_name, phone_number } = req.body;

        if (!username && !full_name && !phone_number) {
            return res.status(400).json({ message: "Aucune donnée à mettre à jour." });
        }

        // Vérifier si le numéro est déjà utilisé par un autre utilisateur
        if (phone_number) {
            const [existingUsers] = await db.query(
                "SELECT * FROM users WHERE phone_number = ? AND user_id != ?",
                [phone_number, req.user.user_id]
            );
            if (existingUsers.length > 0) {
                return res.status(400).json({ message: "Ce numéro de téléphone est déjà utilisé." });
            }
        }

        await db.query(
            "UPDATE users SET username = COALESCE(?, username), full_name = COALESCE(?, full_name), phone_number = COALESCE(?, phone_number) WHERE user_id = ?",
            [username, full_name, phone_number, req.user.user_id]
        );

        res.json({ message: "Profil mis à jour avec succès !" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/users/upload-photo:
 *   post:
 *     summary: Mettre à jour la photo de profil
 *     tags: [Utilisateurs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               profile_image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Photo de profil mise à jour avec succès
 *       400:
 *         description: Aucune image envoyée
 *       500:
 *         description: Erreur serveur
 */
router.post("/upload-photo", authMiddleware, upload.single("profile_image"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "Aucune image envoyée." });
        }

        // Récupérer l'ancienne image
        const [user] = await db.query("SELECT profile_image_url FROM users WHERE user_id = ?", [req.user.user_id]);

        if (user.length > 0 && user[0].profile_image_url) {
            const oldImagePath = user[0].profile_image_url.split("/uploads/")[1];
            if (oldImagePath && fs.existsSync(`${uploadDir}/${oldImagePath}`)) {
                fs.unlinkSync(`${uploadDir}/${oldImagePath}`); // 🔥 Supprime l'ancienne image
            }
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
