const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const db = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

// 📌 Configuration de Multer pour gérer l'upload des cartes grises
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

const upload = multer({ storage });

// 📌 Ajouter un véhicule (chauffeur uniquement)
router.post("/add", authMiddleware, upload.single("carte_grise"), async (req, res) => {
    try {
        if (req.user.user_type !== "driver") {
            return res.status(403).json({ message: "Seuls les chauffeurs peuvent ajouter des véhicules." });
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
});

// 📌 Lister les véhicules d'un chauffeur
router.get("/my-vehicles", authMiddleware, async (req, res) => {
    try {
        if (req.user.user_type !== "driver") {
            return res.status(403).json({ message: "Seuls les chauffeurs peuvent voir leurs véhicules." });
        }

        const [vehicles] = await db.query("SELECT * FROM vehicles WHERE driver_id = ?", [req.user.user_id]);
        res.json(vehicles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 📌 Supprimer un véhicule (chauffeur uniquement)
router.delete("/delete/:vehicle_id", authMiddleware, async (req, res) => {
    try {
        if (req.user.user_type !== "driver") {
            return res.status(403).json({ message: "Seuls les chauffeurs peuvent supprimer leurs véhicules." });
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

module.exports = router;
