const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const db = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

// 📌 Configuration de Multer pour les fichiers (photo carte grise)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, "../uploads/vehicles");
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const fileFilter = (req, file, cb) => {
    if (["image/jpeg", "image/png"].includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Seules les images JPG et PNG sont acceptées."), false);
    }
};

const upload = multer({ storage, fileFilter });

// 📌 Ajouter un véhicule
router.post(
    "/add",
    authMiddleware,
    upload.single("carte_grise"),
    async (req, res) => {
        try {
            if (req.user.user_type !== "driver") {
                return res.status(403).json({ message: "Seuls les chauffeurs peuvent enregistrer des véhicules." });
            }

            const { marque, couleur, immatriculation } = req.body;
            if (!marque || !couleur || !immatriculation) {
                return res.status(400).json({ message: "Tous les champs sont obligatoires." });
            }

            const carteGrise = req.file ? req.file.filename : null;

            await db.query(
                "INSERT INTO vehicles (driver_id, marque, couleur, immatriculation, carte_grise) VALUES (?, ?, ?, ?, ?)",
                [req.user.user_id, marque, couleur, immatriculation, carteGrise]
            );

            res.status(201).json({ message: "Véhicule ajouté avec succès !" });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
);

// 📌 Lister les véhicules d'un chauffeur
router.get("/my-vehicles", authMiddleware, async (req, res) => {
    try {
        if (req.user.user_type !== "driver") {
            return res.status(403).json({ message: "Seuls les chauffeurs peuvent voir leurs véhicules." });
        }

        const [vehicles] = await db.query(
            "SELECT * FROM vehicles WHERE driver_id = ?",
            [req.user.user_id]
        );

        res.json(vehicles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 📌 Supprimer un véhicule
router.delete("/delete/:vehicle_id", authMiddleware, async (req, res) => {
    try {
        if (req.user.user_type !== "driver") {
            return res.status(403).json({ message: "Seuls les chauffeurs peuvent supprimer des véhicules." });
        }

        const { vehicle_id } = req.params;
        const [vehicle] = await db.query("SELECT * FROM vehicles WHERE vehicle_id = ?", [vehicle_id]);

        if (vehicle.length === 0) {
            return res.status(404).json({ message: "Véhicule non trouvé." });
        }

        if (vehicle[0].driver_id !== req.user.user_id) {
            return res.status(403).json({ message: "Vous n'avez pas l'autorisation de supprimer ce véhicule." });
        }

        await db.query("DELETE FROM vehicles WHERE vehicle_id = ?", [vehicle_id]);
        res.json({ message: "Véhicule supprimé avec succès." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 📌 Voir tous les véhicules d'un chauffeur (Admin uniquement)
router.get("/vehicles/:driver_id", authMiddleware, async (req, res) => {
    try {
        if (req.user.user_type !== "admin") {
            return res.status(403).json({ message: "Seuls les administrateurs peuvent voir les véhicules d'un chauffeur." });
        }

        const { driver_id } = req.params;

        const [vehicles] = await db.query(
            "SELECT * FROM vehicles WHERE driver_id = ?",
            [driver_id]
        );

        if (vehicles.length === 0) {
            return res.status(404).json({ message: "Aucun véhicule trouvé pour ce chauffeur." });
        }

        res.json(vehicles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 📌 Sélectionner un véhicule actif (Empêcher les véhicules supprimés ou inactifs)
router.post("/select-vehicle/:vehicle_id", authMiddleware, async (req, res) => {
    try {
        if (req.user.user_type !== "driver") {
            return res.status(403).json({ message: "Seuls les chauffeurs peuvent sélectionner un véhicule." });
        }

        const { vehicle_id } = req.params;

        const [vehicle] = await db.query(
            "SELECT * FROM vehicles WHERE vehicle_id = ? AND driver_id = ?",
            [vehicle_id, req.user.user_id]
        );

        if (vehicle.length === 0) {
            return res.status(404).json({ message: "Véhicule non trouvé ou non attribué à ce chauffeur." });
        }

        if (vehicle[0].status === "deleted") {
            return res.status(403).json({ message: "Ce véhicule a été supprimé et ne peut pas être sélectionné." });
        }

        if (vehicle[0].status === "inactive") {
            return res.status(403).json({ message: "Ce véhicule est inactif et ne peut pas être sélectionné." });
        }

        await db.query("UPDATE drivers SET selected_vehicle_id = ? WHERE user_id = ?", [vehicle_id, req.user.user_id]);

        res.json({ message: "Véhicule sélectionné avec succès !" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 📌 Activer/Désactiver un véhicule (chauffeur)
router.put("/toggle-vehicle/:vehicle_id", authMiddleware, async (req, res) => {
    try {
        if (req.user.user_type !== "driver") {
            return res.status(403).json({ message: "Seuls les chauffeurs peuvent activer/désactiver un véhicule." });
        }

        const { vehicle_id } = req.params;
        const { status } = req.body; // ⚠️ "active" ou "inactive"

        if (!["active", "inactive"].includes(status)) {
            return res.status(400).json({ message: "Statut invalide. Doit être 'active' ou 'inactive'." });
        }

        // Vérifier que le véhicule appartient bien au chauffeur
        const [vehicle] = await db.query("SELECT * FROM vehicles WHERE vehicle_id = ? AND driver_id = ?", [vehicle_id, req.user.user_id]);
        if (vehicle.length === 0) {
            return res.status(404).json({ message: "Véhicule non trouvé ou non attribué à ce chauffeur." });
        }

        // Mise à jour du statut
        await db.query("UPDATE vehicles SET status = ? WHERE vehicle_id = ?", [status, vehicle_id]);

        res.json({ message: `Véhicule ${status === "active" ? "activé" : "désactivé"} avec succès !` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


module.exports = router;
