const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const db = require("../config/db");

// 🔹 1. Ajouter un contact d'urgence
router.post("/add", authMiddleware, async (req, res) => {
    try {
        const { contact_name, contact_phone } = req.body;

        if (!contact_name || !contact_phone) {
            return res.status(400).json({ message: "Nom et numéro du contact requis." });
        }

        await db.query(
            "INSERT INTO emergency_contacts (user_id, contact_name, contact_phone) VALUES (?, ?, ?)",
            [req.user.user_id, contact_name, contact_phone]
        );

        res.status(201).json({ message: "Contact d'urgence ajouté avec succès !" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🔹 2. Récupérer les contacts d'urgence d'un utilisateur
router.get("/my-contacts", authMiddleware, async (req, res) => {
    try {
        const [contacts] = await db.query("SELECT * FROM emergency_contacts WHERE user_id = ?", [req.user.user_id]);

        res.json(contacts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🔹 3. Supprimer un contact d'urgence
router.delete("/delete/:contact_id", authMiddleware, async (req, res) => {
    try {
        const { contact_id } = req.params;

        const [result] = await db.query("DELETE FROM emergency_contacts WHERE contact_id = ? AND user_id = ?", [
            contact_id,
            req.user.user_id,
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Contact non trouvé." });
        }

        res.json({ message: "Contact d'urgence supprimé avec succès." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
