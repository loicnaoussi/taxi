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

/**
 * @swagger
 * components:
 *   schemas:
 *     Vehicle:
 *       type: object
 *       properties:
 *         vehicle_id:
 *           type: integer
 *         marque:
 *           type: string
 *         model:
 *           type: string
 *         year:
 *           type: integer
 *         license_plate:
 *           type: string
 *         couleur:
 *           type: string
 *         immatriculation:
 *           type: string
 *         carte_grise:
 *           type: string
 *         driver_id:
 *           type: integer
 */

/**
 * @swagger
 * /api/vehicles/add:
 *   post:
 *     summary: Ajouter un véhicule (chauffeur uniquement)
 *     tags: [Véhicules]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               marque:
 *                 type: string
 *               model:
 *                 type: string
 *               year:
 *                 type: integer
 *               license_plate:
 *                 type: string
 *               couleur:
 *                 type: string
 *               immatriculation:
 *                 type: string
 *               carte_grise:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Véhicule ajouté avec succès
 *       400:
 *         description: Erreur de validation
 *       403:
 *         description: Accès refusé (chauffeurs uniquement)
 *       500:
 *         description: Erreur serveur
 */
router.post("/add", authMiddleware, upload.single("carte_grise"), async (req, res) => {
    try {
        if (req.user.user_type !== "driver") {
            return res.status(403).json({ message: "Seuls les chauffeurs peuvent ajouter des véhicules." });
        }

        const { marque, model, year, license_plate, couleur, immatriculation } = req.body;

        if (!marque || !model || !year || !license_plate || !couleur || !immatriculation) {
            return res.status(400).json({ message: "Tous les champs sont obligatoires." });
        }

        const carteGrise = req.file ? req.file.filename : null;

        const [result] = await db.query(
            "INSERT INTO vehicles (driver_id, marque, model, year, license_plate, couleur, immatriculation, carte_grise) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [req.user.user_id, marque, model, year, license_plate, couleur, immatriculation, carteGrise]
        );

        if (result.affectedRows === 0) {
            return res.status(500).json({ message: "Erreur lors de l'ajout du véhicule." });
        }

        res.status(201).json({ message: "Véhicule ajouté avec succès !", vehicle_id: result.insertId });
    } catch (error) {
        console.error("Erreur lors de l'ajout d'un véhicule :", error);
        res.status(500).json({ error: "Erreur interne du serveur." });
    }
});

/**
 * @swagger
 * /api/vehicles/my-vehicles:
 *   get:
 *     summary: Lister les véhicules d'un chauffeur
 *     tags: [Véhicules]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des véhicules
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Vehicle'
 *       403:
 *         description: Accès refusé (chauffeurs uniquement)
 *       404:
 *         description: Aucun véhicule trouvé
 *       500:
 *         description: Erreur serveur
 */
router.get("/my-vehicles", authMiddleware, async (req, res) => {
    try {
        if (req.user.user_type !== "driver") {
            return res.status(403).json({ message: "Seuls les chauffeurs peuvent voir leurs véhicules." });
        }

        const [vehicles] = await db.query("SELECT * FROM vehicles WHERE driver_id = ?", [req.user.user_id]);
        
        if (vehicles.length === 0) {
            return res.status(404).json({ message: "Aucun véhicule trouvé." });
        }

        res.json(vehicles);
    } catch (error) {
        console.error("Erreur lors de la récupération des véhicules :", error);
        res.status(500).json({ error: "Erreur interne du serveur." });
    }
});

/**
 * @swagger
 * /api/vehicles/edit-vehicle/{vehicle_id}:
 *   put:
 *     summary: Modifier un véhicule (chauffeur uniquement)
 *     tags: [Véhicules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: vehicle_id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               marque:
 *                 type: string
 *               model:
 *                 type: string
 *               year:
 *                 type: integer
 *               license_plate:
 *                 type: string
 *               couleur:
 *                 type: string
 *               immatriculation:
 *                 type: string
 *     responses:
 *       200:
 *         description: Véhicule mis à jour avec succès
 *       403:
 *         description: Accès refusé (chauffeurs uniquement)
 *       404:
 *         description: Véhicule non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.put("/edit-vehicle/:vehicle_id", authMiddleware, async (req, res) => {
    try {
        if (req.user.user_type !== "driver") {
            return res.status(403).json({ message: "Seuls les chauffeurs peuvent modifier leurs véhicules." });
        }

        const { vehicle_id } = req.params;
        const { marque, model, year, license_plate, couleur, immatriculation } = req.body;

        const [vehicle] = await db.query("SELECT * FROM vehicles WHERE vehicle_id = ?", [vehicle_id]);

        if (vehicle.length === 0) {
            return res.status(404).json({ message: "Véhicule non trouvé." });
        }

        if (vehicle[0].driver_id !== req.user.user_id) {
            return res.status(403).json({ message: "Vous n'avez pas l'autorisation de modifier ce véhicule." });
        }

        await db.query(
            "UPDATE vehicles SET marque = ?, model = ?, year = ?, license_plate = ?, couleur = ?, immatriculation = ? WHERE vehicle_id = ?",
            [marque || vehicle[0].marque, model || vehicle[0].model, year || vehicle[0].year, license_plate || vehicle[0].license_plate, couleur || vehicle[0].couleur, immatriculation || vehicle[0].immatriculation, vehicle_id]
        );

        res.json({ message: "Véhicule mis à jour avec succès." });
    } catch (error) {
        console.error("Erreur lors de la modification du véhicule :", error);
        res.status(500).json({ error: "Erreur interne du serveur." });
    }
});

/**
 * @swagger
 * /api/vehicles/delete-vehicle/{vehicle_id}:
 *   delete:
 *     summary: Supprimer un véhicule (chauffeur uniquement)
 *     tags: [Véhicules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: vehicle_id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Véhicule supprimé avec succès
 *       403:
 *         description: Accès refusé (chauffeurs uniquement)
 *       404:
 *         description: Véhicule non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.delete("/delete-vehicle/:vehicle_id", authMiddleware, async (req, res) => {
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
        console.error("Erreur lors de la suppression du véhicule :", error);
        res.status(500).json({ error: "Erreur interne du serveur." });
    }
});

/**
 * @swagger
 * /api/driver/driver-vehicles/{driver_id}:
 *   get:
 *     summary: Voir la liste des véhicules d'un chauffeur
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: driver_id
 *         required: true
 *         description: ID du chauffeur
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Liste des véhicules récupérée
 *       403:
 *         description: Accès réservé aux administrateurs
 *       500:
 *         description: Erreur serveur
 */
router.get("/driver-vehicles/:driver_id", authMiddleware, async (req, res) => {
    try {
        if (req.user.user_type !== "admin") {
            return res.status(403).json({ message: "Accès réservé aux administrateurs." });
        }

        const { driver_id } = req.params;

        const [vehicles] = await db.query(
            "SELECT * FROM vehicles WHERE driver_id = ?",
            [driver_id]
        );

        res.json({ vehicles });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
