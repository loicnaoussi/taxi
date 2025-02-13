const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const db = require("../config/db");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ✅ Création Automatique de la Table `verifications` si elle est absente
async function ensureVerificationTableExists() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS verifications (
                verification_id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                verification_video VARCHAR(255) NOT NULL,
                cni_front VARCHAR(255) NOT NULL,
                cni_back VARCHAR(255) NOT NULL,
                status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
            )
        `);
        console.log("✅ Table `verifications` vérifiée ou créée.");
    } catch (error) {
        console.error("🚨 Échec de création de la table `verifications` :", error);
        throw new Error("Table 'verifications' manquante dans la base de données.");
    }
}

// 📂 Configuration de Multer (Upload des fichiers)
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

// 📌 1️⃣ Envoi des Fichiers de Vérification
router.post("/upload-verification", authMiddleware, upload.fields([
    { name: "verification_video", maxCount: 1 },
    { name: "cni_front", maxCount: 1 },
    { name: "cni_back", maxCount: 1 }
]), async (req, res) => {
    try {
        await ensureVerificationTableExists();

        if (!req.files || !req.files.verification_video || !req.files.cni_front || !req.files.cni_back) {
            return res.status(400).json({ message: "Tous les fichiers doivent être fournis." });
        }

        const verificationVideo = req.files.verification_video[0].filename;
        const cniFront = req.files.cni_front[0].filename;
        const cniBack = req.files.cni_back[0].filename;

        const [existing] = await db.query("SELECT * FROM verifications WHERE user_id = ?", [req.user.user_id]);

        if (existing.length > 0) {
            return res.status(400).json({ message: "Une vérification est déjà en cours pour cet utilisateur." });
        }

        await db.query(
            "INSERT INTO verifications (user_id, verification_video, cni_front, cni_back, status) VALUES (?, ?, ?, ?, 'pending')",
            [req.user.user_id, verificationVideo, cniFront, cniBack]
        );

        res.status(201).json({ message: "Fichiers de vérification envoyés avec succès !" });
    } catch (error) {
        console.error("🚨 Erreur lors de l'envoi des fichiers de vérification :", error);
        res.status(500).json({ error: error.message });
    }
});

// 📌 2️⃣ Récupération du Statut de Vérification
router.get("/status", authMiddleware, async (req, res) => {
    try {
        await ensureVerificationTableExists();

        const [verification] = await db.query(
            "SELECT status FROM verifications WHERE user_id = ?",
            [req.user.user_id]
        );

        if (verification.length === 0) {
            return res.status(404).json({ message: "Aucune vérification trouvée." });
        }

        res.json({ status: verification[0].status });
    } catch (error) {
        console.error("🚨 Erreur lors de la récupération du statut de vérification :", error);
        res.status(500).json({ error: error.message });
    }
});

// 📌 3️⃣ Mise à Jour du Statut (Admin uniquement)
router.put("/update/:user_id", authMiddleware, async (req, res) => {
    try {
        await ensureVerificationTableExists();

        if (req.user.user_type !== "admin") {
            return res.status(403).json({ message: "Seuls les administrateurs peuvent modifier les statuts." });
        }

        const { user_id } = req.params;
        const { status } = req.body;

        if (!["pending", "approved", "rejected"].includes(status)) {
            return res.status(400).json({ message: "Statut invalide. Valeurs : 'pending', 'approved', 'rejected'." });
        }

        const [existing] = await db.query("SELECT * FROM verifications WHERE user_id = ?", [user_id]);

        if (existing.length === 0) {
            return res.status(404).json({ message: "Aucune vérification trouvée." });
        }

        await db.query("UPDATE verifications SET status = ? WHERE user_id = ?", [status, user_id]);

        res.json({ message: `Statut de vérification mis à jour : '${status}'` });
    } catch (error) {
        console.error("🚨 Erreur lors de la mise à jour du statut de vérification :", error);
        res.status(500).json({ error: error.message });
    }
});

// 📌 4️⃣ Suppression d'une Vérification (Admin uniquement)
router.delete("/delete/:user_id", authMiddleware, async (req, res) => {
    try {
        await ensureVerificationTableExists();

        if (req.user.user_type !== "admin") {
            return res.status(403).json({ message: "Seuls les administrateurs peuvent supprimer une vérification." });
        }

        const { user_id } = req.params;

        const [existing] = await db.query("SELECT * FROM verifications WHERE user_id = ?", [user_id]);

        if (existing.length === 0) {
            return res.status(404).json({ message: "Aucune vérification trouvée." });
        }

        await db.query("DELETE FROM verifications WHERE user_id = ?", [user_id]);

        res.json({ message: "Vérification supprimée avec succès." });
    } catch (error) {
        console.error("🚨 Erreur lors de la suppression de la vérification :", error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
