const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const db = require("../config/db");

// 🔹 1. Laisser un avis et une note après un trajet
router.post("/add", authMiddleware, async (req, res) => {
    try {
        const { ride_id, rating, comment } = req.body;

        if (!ride_id || !rating) {
            return res.status(400).json({ message: "Le trajet et la note sont requis." });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({ message: "La note doit être entre 1 et 5." });
        }

        await db.query(
            "INSERT INTO reviews (ride_id, reviewer_id, rating, comment) VALUES (?, ?, ?, ?)",
            [ride_id, req.user.user_id, rating, comment || ""]
        );

        res.status(201).json({ message: "Avis ajouté avec succès !" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🔹 2. Voir les avis reçus par un utilisateur (chauffeur ou passager)
router.get("/my-reviews", authMiddleware, async (req, res) => {
    try {
        const [reviews] = await db.query(
            "SELECT r.review_id, r.ride_id, r.rating, r.comment, u.username AS reviewer FROM reviews r " +
            "JOIN users u ON r.reviewer_id = u.user_id " +
            "JOIN rides ride ON r.ride_id = ride.ride_id " +
            "WHERE ride.passenger_id = ? OR ride.driver_id = ?",
            [req.user.user_id, req.user.user_id]
        );

        res.json(reviews);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🔹 3. Supprimer un avis laissé par l'utilisateur
router.delete("/delete/:review_id", authMiddleware, async (req, res) => {
    try {
        const { review_id } = req.params;

        const [result] = await db.query(
            "DELETE FROM reviews WHERE review_id = ? AND reviewer_id = ?",
            [review_id, req.user.user_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Avis non trouvé." });
        }

        res.json({ message: "Avis supprimé avec succès." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
