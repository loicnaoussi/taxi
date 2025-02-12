const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const db = require("../config/db");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// 📌 Vérifier si la table 'verifications' existe avant d'exécuter une requête
async function ensureVerificationTableExists() {
    try {
        await db.query("SELECT 1 FROM verifications LIMIT 1");
    } catch (error) {
        console.error("🚨 La table 'verifications' n'existe pas. Veuillez l'ajouter à la base de données.");
        throw new Error("Table 'verifications' manquante dans la base de données.");
    }
}

// 📌 Configuration de Multer pour gérer les fichiers d’identité
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

// 📌 Envoi des fichiers de vérification
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

        // Vérifier si l'utilisateur a déjà une vérification en attente
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

// 📌 Récupération du statut de vérification
router.get("/status", authMiddleware, async (req, res) => {
    try {
        await ensureVerificationTableExists();

        const [verification] = await db.query("SELECT status FROM verifications WHERE user_id = ?", [req.user.user_id]);

        if (verification.length === 0) {
            return res.status(404).json({ message: "Aucune vérification trouvée." });
        }

        res.json({ status: verification[0].status });
    } catch (error) {
        console.error("🚨 Erreur lors de la récupération du statut de vérification :", error);
        res.status(500).json({ error: error.message });
    }
});

// 📌 Mise à jour du statut de vérification (Admin uniquement)
router.put("/update/:user_id", authMiddleware, async (req, res) => {
    try {
        await ensureVerificationTableExists();

        if (req.user.user_type !== "admin") {
            return res.status(403).json({ message: "Accès refusé. Seuls les administrateurs peuvent modifier les statuts de vérification." });
        }

        const { user_id } = req.params;
        const { status } = req.body;

        if (!["pending", "approved", "rejected"].includes(status)) {
            return res.status(400).json({ message: "Statut invalide. Valeurs autorisées : 'pending', 'approved', 'rejected'." });
        }

        const [existing] = await db.query("SELECT * FROM verifications WHERE user_id = ?", [user_id]);

        if (existing.length === 0) {
            return res.status(404).json({ message: "Aucune vérification trouvée pour cet utilisateur." });
        }

        await db.query("UPDATE verifications SET status = ? WHERE user_id = ?", [status, user_id]);

        res.json({ message: `Statut de vérification mis à jour en '${status}'` });
    } catch (error) {
        console.error("🚨 Erreur lors de la mise à jour du statut de vérification :", error);
        res.status(500).json({ error: error.message });
    }
});

// 📌 Suppression d'une vérification (Admin uniquement)
router.delete("/delete/:user_id", authMiddleware, async (req, res) => {
    try {
        await ensureVerificationTableExists();

        if (req.user.user_type !== "admin") {
            return res.status(403).json({ message: "Accès refusé. Seuls les administrateurs peuvent supprimer une vérification." });
        }

        const { user_id } = req.params;

        const [existing] = await db.query("SELECT * FROM verifications WHERE user_id = ?", [user_id]);

        if (existing.length === 0) {
            return res.status(404).json({ message: "Aucune vérification trouvée pour cet utilisateur." });
        }

        await db.query("DELETE FROM verifications WHERE user_id = ?", [user_id]);

        res.json({ message: "Vérification supprimée avec succès." });
    } catch (error) {
        console.error("🚨 Erreur lors de la suppression de la vérification :", error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
