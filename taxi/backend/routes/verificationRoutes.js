const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const db = require("../config/db");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ─────────────────────────────────────────────────────────────────────────────
// Vérifier ou créer la table `verifications`
// ─────────────────────────────────────────────────────────────────────────────
async function ensureVerificationTableExists() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS verifications (
        verification_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        verification_video VARCHAR(255) NOT NULL,
        cni_front VARCHAR(255) NOT NULL,
        cni_back VARCHAR(255) NOT NULL,
        status ENUM('pending','approved','rejected') DEFAULT 'pending',
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

// ─────────────────────────────────────────────────────────────────────────────
// Configuration Multer pour l’upload
// ─────────────────────────────────────────────────────────────────────────────
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
  },
});
const upload = multer({ storage });

// ─────────────────────────────────────────────────────────────────────────────
// A) Envoyer les fichiers de vérification
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @swagger
 * /api/verifications/upload-verification:
 *   post:
 *     summary: "Envoyer les fichiers de vérification (Vidéo + CNI)"
 *     tags: [Vérifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               verification_video:
 *                 type: string
 *                 format: binary
 *               cni_front:
 *                 type: string
 *                 format: binary
 *               cni_back:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: "Fichiers de vérification envoyés avec succès"
 *       400:
 *         description: "Tous les fichiers sont requis"
 *       500:
 *         description: "Erreur serveur"
 */
router.post(
  "/upload-verification",
  authMiddleware,
  upload.fields([
    { name: "verification_video", maxCount: 1 },
    { name: "cni_front", maxCount: 1 },
    { name: "cni_back", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      await ensureVerificationTableExists();

      if (
        !req.files ||
        !req.files.verification_video ||
        !req.files.cni_front ||
        !req.files.cni_back
      ) {
        return res
          .status(400)
          .json({ message: "Tous les fichiers doivent être fournis." });
      }

      const verificationVideo = req.files.verification_video[0].filename;
      const cniFront = req.files.cni_front[0].filename;
      const cniBack = req.files.cni_back[0].filename;

      // Vérifie si une vérification est déjà en cours
      const [existing] = await db.query(
        "SELECT * FROM verifications WHERE user_id = ?",
        [req.user.user_id]
      );
      if (existing.length > 0) {
        return res.status(400).json({
          message: "Une vérification est déjà en cours pour cet utilisateur.",
        });
      }

      await db.query(
        `
          INSERT INTO verifications
            (user_id, verification_video, cni_front, cni_back, status)
          VALUES (?, ?, ?, ?, 'pending')
        `,
        [req.user.user_id, verificationVideo, cniFront, cniBack]
      );

      return res
        .status(201)
        .json({ message: "Fichiers de vérification envoyés avec succès !" });
    } catch (error) {
      console.error("🚨 Erreur lors de l'envoi des fichiers de vérification :", error);
      return res.status(500).json({ error: error.message });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// B) Récupérer le statut de vérification
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @swagger
 * /api/verifications/status:
 *   get:
 *     summary: "Récupérer le statut de vérification"
 *     tags: [Vérifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: "Statut de vérification récupéré"
 *       404:
 *         description: "Aucune vérification trouvée"
 *       500:
 *         description: "Erreur serveur"
 */
router.get("/status", authMiddleware, async (req, res) => {
  try {
    await ensureVerificationTableExists();
    const [rows] = await db.query(
      "SELECT status FROM verifications WHERE user_id = ?",
      [req.user.user_id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "Aucune vérification trouvée." });
    }
    return res.json({ status: rows[0].status });
  } catch (error) {
    console.error("🚨 Erreur lors de la récupération du statut :", error);
    return res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// C) Mettre à jour le statut (ADMIN)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @swagger
 * /api/verifications/update/{user_id}:
 *   put:
 *     summary: "Mettre à jour le statut de vérification (Admin uniquement)"
 *     tags: [Vérifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: "ID de l'utilisateur"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, approved, rejected]
 *     responses:
 *       200:
 *         description: "Statut mis à jour"
 *       400:
 *         description: "Statut invalide"
 *       403:
 *         description: "Accès refusé"
 *       404:
 *         description: "Aucune vérification trouvée"
 *       500:
 *         description: "Erreur serveur"
 */
router.put("/update/:user_id", authMiddleware, async (req, res) => {
  try {
    await ensureVerificationTableExists();
    if (req.user.user_type !== "admin") {
      return res
        .status(403)
        .json({ message: "Seuls les administrateurs peuvent modifier les statuts." });
    }

    const { user_id } = req.params;
    const { status } = req.body;

    if (!["pending", "approved", "rejected"].includes(status)) {
      return res.status(400).json({
        message: "Statut invalide. Utilisez 'pending', 'approved' ou 'rejected'.",
      });
    }

    const [existing] = await db.query(
      "SELECT * FROM verifications WHERE user_id = ?",
      [user_id]
    );
    if (existing.length === 0) {
      return res.status(404).json({ message: "Aucune vérification trouvée." });
    }

    await db.query(
      "UPDATE verifications SET status = ? WHERE user_id = ?",
      [status, user_id]
    );

    return res.json({ message: `Statut de vérification mis à jour : '${status}'` });
  } catch (error) {
    console.error("🚨 Erreur lors de la mise à jour du statut :", error);
    return res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// D) Supprimer une vérification (ADMIN)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @swagger
 * /api/verifications/delete/{user_id}:
 *   delete:
 *     summary: "Supprimer une vérification (Admin uniquement)"
 *     tags: [Vérifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: "ID de l'utilisateur"
 *     responses:
 *       200:
 *         description: "Vérification supprimée"
 *       403:
 *         description: "Accès refusé"
 *       404:
 *         description: "Aucune vérification trouvée"
 *       500:
 *         description: "Erreur serveur"
 */
router.delete("/delete/:user_id", authMiddleware, async (req, res) => {
  try {
    await ensureVerificationTableExists();
    if (req.user.user_type !== "admin") {
      return res
        .status(403)
        .json({ message: "Seuls les administrateurs peuvent supprimer une vérification." });
    }

    const { user_id } = req.params;
    const [existing] = await db.query(
      "SELECT * FROM verifications WHERE user_id = ?",
      [user_id]
    );
    if (existing.length === 0) {
      return res.status(404).json({ message: "Aucune vérification trouvée." });
    }

    await db.query("DELETE FROM verifications WHERE user_id = ?", [user_id]);
    return res.json({ message: "Vérification supprimée avec succès." });
  } catch (error) {
    console.error("🚨 Erreur lors de la suppression de la vérification :", error);
    return res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// E) Alerte d’urgence
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @swagger
 * /api/verifications/emergency-alert:
 *   post:
 *     summary: "Envoi d'une alerte d'urgence (pour le chauffeur)"
 *     tags: [Vérifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               lat:
 *                 type: number
 *               lng:
 *                 type: number
 *     responses:
 *       201:
 *         description: "Alerte d'urgence envoyée"
 *       500:
 *         description: "Erreur serveur"
 */
router.post("/emergency-alert", authMiddleware, async (req, res) => {
  try {
    // Vérifier éventuellement req.user.user_type === "driver"
    const userId = req.user.user_id;
    const { lat, lng } = req.body || {};

    // Créer la table si besoin
    await db.query(`
      CREATE TABLE IF NOT EXISTS emergency_alerts (
        alert_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        latitude DECIMAL(10, 6) DEFAULT NULL,
        longitude DECIMAL(10, 6) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      )
    `);

    await db.query(
      "INSERT INTO emergency_alerts (user_id, latitude, longitude) VALUES (?, ?, ?)",
      [userId, lat || null, lng || null]
    );

    return res.status(201).json({ message: "Alerte d'urgence envoyée !" });
  } catch (error) {
    console.error("🚨 Erreur lors de l'alerte d'urgence :", error);
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
