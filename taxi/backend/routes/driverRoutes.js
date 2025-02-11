const express = require("express");
const router = express.Router();
const db = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

// 📌 Modifier un véhicule (changer couleur, immatriculation, etc.)
router.put("/edit-vehicle/:vehicle_id", authMiddleware, async (req, res) => {
    try {
        if (req.user.user_type !== "driver") {
            return res.status(403).json({ message: "Seuls les chauffeurs peuvent modifier un véhicule." });
        }

        const { vehicle_id } = req.params;
        const { color, license_plate, brand } = req.body;

        if (!color && !license_plate && !brand) {
            return res.status(400).json({ message: "Au moins un champ doit être modifié." });
        }

        // Vérifier que le véhicule appartient bien au chauffeur
        const [vehicle] = await db.query(
            "SELECT * FROM vehicles WHERE vehicle_id = ? AND driver_id = ?",
            [vehicle_id, req.user.user_id]
        );

        if (vehicle.length === 0) {
            return res.status(404).json({ message: "Véhicule non trouvé ou non attribué à ce chauffeur." });
        }

        // Vérifier que l'immatriculation n'existe pas déjà pour ce chauffeur
        if (license_plate) {
            const [existingVehicle] = await db.query(
                "SELECT * FROM vehicles WHERE license_plate = ? AND driver_id = ? AND vehicle_id != ?",
                [license_plate, req.user.user_id, vehicle_id]
            );
            if (existingVehicle.length > 0) {
                return res.status(400).json({ message: "Un autre véhicule avec cette immatriculation existe déjà." });
            }
        }

        // Mettre à jour les informations du véhicule
        await db.query(
            "UPDATE vehicles SET color = COALESCE(?, color), license_plate = COALESCE(?, license_plate), brand = COALESCE(?, brand) WHERE vehicle_id = ?",
            [color, license_plate, brand, vehicle_id]
        );

        res.json({ message: "Véhicule mis à jour avec succès !" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 📌 Désactiver temporairement un véhicule (sans suppression définitive)
router.put("/deactivate-vehicle/:vehicle_id", authMiddleware, async (req, res) => {
    try {
        if (req.user.user_type !== "driver") {
            return res.status(403).json({ message: "Seuls les chauffeurs peuvent désactiver un véhicule." });
        }

        const { vehicle_id } = req.params;

        // Vérifier que le véhicule appartient bien au chauffeur
        const [vehicle] = await db.query(
            "SELECT * FROM vehicles WHERE vehicle_id = ? AND driver_id = ?",
            [vehicle_id, req.user.user_id]
        );

        if (vehicle.length === 0) {
            return res.status(404).json({ message: "Véhicule non trouvé ou non attribué à ce chauffeur." });
        }

        // Désactiver le véhicule
        await db.query("UPDATE vehicles SET is_active = 0 WHERE vehicle_id = ?", [vehicle_id]);

        res.json({ message: "Véhicule désactivé avec succès." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 📌 Supprimer un véhicule avec confirmation
router.delete("/delete-vehicle/:vehicle_id", authMiddleware, async (req, res) => {
    try {
        if (req.user.user_type !== "driver") {
            return res.status(403).json({ message: "Seuls les chauffeurs peuvent supprimer un véhicule." });
        }

        const { vehicle_id } = req.params;
        const { confirm } = req.body; // ⚠️ Le chauffeur doit envoyer `{ "confirm": true }` pour valider la suppression

        if (!confirm) {
            return res.status(400).json({ message: "Confirmation requise pour supprimer le véhicule." });
        }

        // Vérifier que le véhicule appartient bien au chauffeur
        const [vehicle] = await db.query(
            "SELECT * FROM vehicles WHERE vehicle_id = ? AND driver_id = ?",
            [vehicle_id, req.user.user_id]
        );

        if (vehicle.length === 0) {
            return res.status(404).json({ message: "Véhicule non trouvé ou non attribué à ce chauffeur." });
        }

        // Vérifier que le véhicule n'est pas sélectionné actuellement
        if (vehicle[0].is_active === 1) {
            return res.status(400).json({ message: "Impossible de supprimer un véhicule actif. Désactivez-le d'abord." });
        }

        // Supprimer le véhicule
        await db.query("DELETE FROM vehicles WHERE vehicle_id = ?", [vehicle_id]);

        res.json({ message: "Véhicule supprimé avec succès." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 📌 Voir la liste des véhicules d'un chauffeur (Admin)
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
