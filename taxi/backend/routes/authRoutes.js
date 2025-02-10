const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");
const { check, validationResult } = require("express-validator");
require("dotenv").config();

// Utilitaire pour générer un OTP (code à 6 chiffres)
const generateOTP = () => Math.floor(100000 + Math.random() * 900000);

// 🔹 Inscription avec envoi d’OTP
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
            const otp = generateOTP();

            await db.query(
                "INSERT INTO users (username, email, password_hash, full_name, phone_number, user_type, otp) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [username, email, hashedPassword, full_name, phone_number, user_type, otp]
            );

            // Envoyer OTP par email/SMS ici

            res.status(201).json({ message: "Utilisateur inscrit avec succès ! Code OTP envoyé.", otp });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
);

// 🔹 Vérification de l’OTP
router.post("/verify-otp", async (req, res) => {
    try {
        const { email, phone_number, otp } = req.body;

        const [users] = await db.query(
            "SELECT * FROM users WHERE (email = ? OR phone_number = ?) AND otp = ?",
            [email, phone_number, otp]
        );

        if (users.length === 0) {
            return res.status(400).json({ message: "Code OTP incorrect ou expiré." });
        }

        await db.query("UPDATE users SET otp = NULL WHERE user_id = ?", [users[0].user_id]);

        res.json({ message: "Vérification réussie. Compte activé." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🔹 Connexion avec refresh_token
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

        const refreshToken = jwt.sign(
            { user_id: users[0].user_id },
            process.env.REFRESH_SECRET,
            { expiresIn: "7d" }
        );

        await db.query("UPDATE users SET refresh_token = ? WHERE user_id = ?", [refreshToken, users[0].user_id]);

        res.json({ accessToken, refreshToken, user: users[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🔹 Modifier les informations du compte
router.put("/update", authMiddleware, async (req, res) => {
    const { username, email, phone_number, full_name } = req.body;
    const userId = req.user.user_id;

    try {
        if (email || phone_number) {
            const [existingUsers] = await db.query(
                "SELECT * FROM users WHERE (email = ? OR phone_number = ?) AND user_id != ?",
                [email, phone_number, userId]
            );
            if (existingUsers.length > 0) {
                return res.status(400).json({ message: "Email ou numéro de téléphone déjà utilisé." });
            }
        }

        await db.query(
            "UPDATE users SET username = COALESCE(?, username), email = COALESCE(?, email), phone_number = COALESCE(?, phone_number), full_name = COALESCE(?, full_name) WHERE user_id = ?",
            [username, email, phone_number, full_name, userId]
        );

        res.json({ message: "Informations mises à jour avec succès !" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🔹 Désactiver (supprimer) le compte
router.delete("/delete", authMiddleware, async (req, res) => {
    const userId = req.user.user_id;

    try {
        await db.query("UPDATE users SET is_deleted = 1 WHERE user_id = ?", [userId]);

        res.json({ message: "Compte supprimé (désactivé)." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🔹 Récupération de mot de passe avec OTP
router.post("/forgot-password", async (req, res) => {
    try {
        const { identifier } = req.body;
        const [users] = await db.query(
            "SELECT * FROM users WHERE email = ? OR phone_number = ?",
            [identifier, identifier]
        );

        if (users.length === 0) {
            return res.status(404).json({ message: "Utilisateur non trouvé." });
        }

        const otp = generateOTP();
        await db.query("UPDATE users SET otp = ? WHERE user_id = ?", [otp, users[0].user_id]);

        res.json({ message: "Code OTP envoyé.", otp });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🔹 Réinitialisation du mot de passe
router.post("/reset-password", async (req, res) => {
    try {
        const { identifier, otp, newPassword } = req.body;

        const [users] = await db.query(
            "SELECT * FROM users WHERE (email = ? OR phone_number = ?) AND otp = ?",
            [identifier, identifier, otp]
        );

        if (users.length === 0) {
            return res.status(400).json({ message: "OTP invalide." });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.query("UPDATE users SET password_hash = ?, otp = NULL WHERE user_id = ?", [hashedPassword, users[0].user_id]);

        res.json({ message: "Mot de passe réinitialisé avec succès." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
