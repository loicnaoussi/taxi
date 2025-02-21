const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");
const { check, validationResult } = require("express-validator");
require("dotenv").config();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: "Inscription d'un nouvel utilisateur"
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone_number:
 *                 type: string
 *               password:
 *                 type: string
 *                 format: password
 *               full_name:
 *                 type: string
 *               user_type:
 *                 type: string
 *                 enum: [passenger, driver, admin]
 *     responses:
 *       201:
 *         description: "Utilisateur inscrit avec succès"
 *       400:
 *         description: "Requête invalide ou utilisateur existant"
 *       500:
 *         description: "Erreur serveur"
 */
router.post(
  "/register",
  [
    check("username").notEmpty().withMessage("Le nom d'utilisateur est requis."),
    check("email").isEmail().withMessage("Email invalide."),
    check("phone_number").notEmpty().withMessage("Le numéro de téléphone est requis."),
    check("password").isLength({ min: 6 }).withMessage("Le mot de passe doit contenir au moins 6 caractères."),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password, full_name, phone_number, user_type } = req.body;

    try {
      // Vérifier si email / phone_number déjà utilisés
      const [existingUsers] = await db.query(
        "SELECT * FROM users WHERE email = ? OR phone_number = ?",
        [email, phone_number]
      );
      if (existingUsers.length > 0) {
        return res.status(400).json({ message: "Email ou numéro de téléphone déjà utilisé." });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      await db.query(
        "INSERT INTO users (username, email, password_hash, full_name, phone_number, user_type) VALUES (?, ?, ?, ?, ?, ?)",
        [username, email, hashedPassword, full_name, phone_number, user_type]
      );

      return res.status(201).json({ message: "Utilisateur inscrit avec succès !" });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: "Connexion utilisateur"
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               identifier:
 *                 type: string
 *                 description: "Email ou numéro de téléphone"
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: "Connexion réussie, retourne le token"
 *       401:
 *         description: "Identifiants incorrects"
 *       500:
 *         description: "Erreur serveur"
 */
router.post("/login", async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ message: "Email/téléphone et mot de passe requis." });
    }

    const [users] = await db.query(
      "SELECT * FROM users WHERE email = ? OR phone_number = ?",
      [identifier, identifier]
    );
    if (users.length === 0) {
      return res.status(401).json({ message: "Identifiants incorrects." });
    }

    const validPassword = await bcrypt.compare(password, users[0].password_hash);
    if (!validPassword) {
      return res.status(401).json({ message: "Identifiants incorrects." });
    }

    const accessToken = jwt.sign(
      { user_id: users[0].user_id, user_type: users[0].user_type },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return res.json({ accessToken, user: users[0] });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/auth/update:
 *   put:
 *     summary: "Modifier les informations du compte"
 *     tags: [Auth]
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
 *         description: "Profil mis à jour avec succès"
 *       500:
 *         description: "Erreur serveur"
 */
router.put("/update", authMiddleware, async (req, res) => {
  try {
    const { username, full_name, phone_number } = req.body;
    await db.query(
      "UPDATE users SET username = ?, full_name = ?, phone_number = ? WHERE user_id = ?",
      [username, full_name, phone_number, req.user.user_id]
    );
    return res.json({ message: "Profil mis à jour avec succès !" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/auth/delete:
 *   delete:
 *     summary: "Supprimer (désactiver) le compte utilisateur"
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: "Compte désactivé avec succès"
 *       500:
 *         description: "Erreur serveur"
 */
router.delete("/delete", authMiddleware, async (req, res) => {
  try {
    await db.query("UPDATE users SET is_deleted = 1 WHERE user_id = ?", [req.user.user_id]);
    return res.json({ message: "Compte désactivé avec succès." });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/auth/security-code:
 *   get:
 *     summary: "Récupérer un code de sécurité (pour un chauffeur)"
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: "Code de sécurité renvoyé"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *       403:
 *         description: "Accès refusé si user_type != driver"
 *       500:
 *         description: "Erreur serveur"
 */
router.get("/security-code", authMiddleware, async (req, res) => {
  try {
    if (req.user.user_type !== "driver") {
      return res.status(403).json({ message: "Accès réservé aux chauffeurs." });
    }

    // Générer 6 chiffres aléatoires
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Enregistrement en base si besoin
    // await db.query("UPDATE users SET security_code=? WHERE user_id=?", [code, req.user.user_id]);

    return res.json({ code });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/auth/check-password:
 *   post:
 *     summary: "Vérifier le mot de passe de l'utilisateur (ex chauffeur)"
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: "Renvoie valid: true/false"
 *       404:
 *         description: "Utilisateur introuvable"
 *       500:
 *         description: "Erreur serveur"
 */
router.post("/check-password", authMiddleware, async (req, res) => {
  try {
    const { password } = req.body;
    const [rows] = await db.query(
      "SELECT password_hash FROM users WHERE user_id = ?",
      [req.user.user_id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "Utilisateur introuvable." });
    }

    const isMatch = await bcrypt.compare(password, rows[0].password_hash);
    return res.json({ valid: isMatch });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
