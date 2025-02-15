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
 *     summary: Inscription d'un nouvel utilisateur
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
 *         description: Utilisateur inscrit avec succès
 *       400:
 *         description: Requête invalide ou utilisateur existant
 *       500:
 *         description: Erreur serveur
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
            // Vérifier l'unicité de l'email et du numéro de téléphone
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

            res.status(201).json({ message: "Utilisateur inscrit avec succès !" });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Connexion utilisateur
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
 *                 description: Email ou numéro de téléphone
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Connexion réussie, retourne le token
 *       401:
 *         description: Identifiants incorrects
 *       500:
 *         description: Erreur serveur
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

        if (users.length === 0 || !(await bcrypt.compare(password, users[0].password_hash))) {
            return res.status(401).json({ message: "Identifiants incorrects." });
        }

        const accessToken = jwt.sign(
            { user_id: users[0].user_id, user_type: users[0].user_type },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        res.json({ accessToken, user: users[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/auth/update:
 *   put:
 *     summary: Modifier les informations du compte
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
 *         description: Profil mis à jour avec succès
 *       500:
 *         description: Erreur serveur
 */
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

/**
 * @swagger
 * /api/auth/delete:
 *   delete:
 *     summary: Supprimer (désactiver) le compte utilisateur
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Compte désactivé avec succès
 *       500:
 *         description: Erreur serveur
 */
router.delete("/delete", authMiddleware, async (req, res) => {
    try {
        await db.query("UPDATE users SET is_deleted = 1 WHERE user_id = ?", [req.user.user_id]);
        res.json({ message: "Compte désactivé avec succès." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
