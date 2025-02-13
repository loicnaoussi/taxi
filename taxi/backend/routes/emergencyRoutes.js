const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const db = require("../config/db");

// 📌 1. Ajouter un contact d'urgence (Max : 3 contacts)
router.post("/add", authMiddleware, async (req, res) => {
	try {
		const { contact_name, contact_phone } = req.body;

		if (!contact_name || !contact_phone) {
			return res
				.status(400)
				.json({ message: "Nom et numéro du contact requis." });
		}

		// Vérifier si l'utilisateur a déjà 3 contacts enregistrés
		const [existingContacts] = await db.query(
			"SELECT COUNT(*) AS total FROM emergency_contacts WHERE user_id = ?",
			[req.user.user_id]
		);

		if (existingContacts[0].total >= 3) {
			return res
				.status(400)
				.json({
					message:
						"Vous ne pouvez enregistrer que 3 contacts d'urgence.",
				});
		}

		// Vérifier si le contact existe déjà
		const [duplicate] = await db.query(
			"SELECT * FROM emergency_contacts WHERE user_id = ? AND contact_phone = ?",
			[req.user.user_id, contact_phone]
		);

		if (duplicate.length > 0) {
			return res
				.status(400)
				.json({ message: "Ce contact est déjà enregistré." });
		}

		// Insertion du contact
		const [insertResult] = await db.query(
			"INSERT INTO emergency_contacts (user_id, contact_name, contact_phone) VALUES (?, ?, ?)",
			[req.user.user_id, contact_name, contact_phone]
		);

		// Retourner l'ID du contact inséré
		return res.status(201).json({
			message: "Contact d'urgence ajouté avec succès !",
			contact_id: insertResult.insertId
		});

	} catch (error) {
		if (!res.headersSent) {
			return res.status(500).json({ error: error.message });
		}
	}
});

// 📌 Récupérer les contacts d’un utilisateur
router.get("/my-contacts", authMiddleware, async (req, res) => {
    try {
        const [contacts] = await db.query(
            "SELECT contact_id, contact_name, contact_phone, created_at FROM emergency_contacts WHERE user_id = ?",
            [req.user.user_id]
        );

        // ✅ Toujours renvoyer un tableau (même vide)
        res.status(200).json(Array.isArray(contacts) ? contacts : []);
    } catch (error) {
        console.error("🔥 Erreur lors de la récupération des contacts :", error);
        res.status(500).json({ error: error.message });
    }
});


// 📌 3. Supprimer un contact d'urgence (Vérification requise)
router.delete("/delete/:contact_id", authMiddleware, async (req, res) => {
	try {
		const { contact_id } = req.params;

		// Vérifier si le contact existe
		const [contact] = await db.query(
			"SELECT * FROM emergency_contacts WHERE contact_id = ? AND user_id = ?",
			[contact_id, req.user.user_id]
		);

		if (contact.length === 0) {
			return res
				.status(404)
				.json({ message: "Contact non trouvé ou déjà supprimé." });
		}

		// Suppression du contact
		await db.query("DELETE FROM emergency_contacts WHERE contact_id = ?", [
			contact_id,
		]);

		res.json({ message: "Contact d'urgence supprimé avec succès." });
	} catch (error) {
		if (!res.headersSent) {
			return res.status(500).json({ error: error.message });
		}
	}
});

// 📌 4. Permettre aux administrateurs de voir les contacts d'urgence d'un utilisateur
router.get("/user/:user_id", authMiddleware, async (req, res) => {
	try {
		if (req.user.user_type !== "admin") {
			return res
				.status(403)
				.json({ message: "Accès réservé aux administrateurs." });
		}

		const { user_id } = req.params;

		const [contacts] = await db.query(
			"SELECT contact_id, contact_name, contact_phone FROM emergency_contacts WHERE user_id = ?",
			[user_id]
		);

		res.json({ total: contacts.length, contacts });
	} catch (error) {
		if (!res.headersSent) {
			return res.status(500).json({ error: error.message });
		}
	}
});

module.exports = router;
