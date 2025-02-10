const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const db = require("../config/db");
const { io } = require("../server"); // Importer WebSockets

// 🔹 1. Créer un trajet (passager)
router.post("/create", authMiddleware, async (req, res) => {
    console.log("Données reçues :", req.body);

    const { pickup_location, dropoff_location, fare } = req.body;
    if (!pickup_location || !dropoff_location || !fare) {
        return res.status(400).json({ message: "Tous les champs sont requis." });
    }

    try {
        if (req.user.user_type !== "passenger") {
            return res.status(403).json({ message: "Seuls les passagers peuvent créer des trajets." });
        }

        const [result] = await db.query(
            "INSERT INTO rides (passenger_id, pickup_location, dropoff_location, status, fare) VALUES (?, ?, ?, 'requested', ?)",
            [req.user.user_id, pickup_location, dropoff_location, fare]
        );

        // 🔥 Notification WebSocket : Un nouveau trajet est disponible
        io.emit("new_ride", {
            ride_id: result.insertId,
            pickup_location,
            dropoff_location,
            fare,
        });

        res.status(201).json({ message: "Trajet créé avec succès !", ride_id: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🔹 2. Accepter un trajet (chauffeur)
router.post("/accept/:ride_id", authMiddleware, async (req, res) => {
    try {
        if (req.user.user_type !== "driver") {
            return res.status(403).json({ message: "Seuls les chauffeurs peuvent accepter des trajets." });
        }

        const { ride_id } = req.params;
        const [ride] = await db.query("SELECT * FROM rides WHERE ride_id = ?", [ride_id]);

        if (ride.length === 0) {
            return res.status(404).json({ message: "Trajet non trouvé." });
        }

        if (ride[0].status !== "requested") {
            return res.status(400).json({ message: "Ce trajet a déjà été pris ou annulé." });
        }

        await db.query("UPDATE rides SET driver_id = ?, status = 'accepted' WHERE ride_id = ?", [
            req.user.user_id,
            ride_id,
        ]);

        // 🔥 Notification WebSocket : Le trajet a été accepté par un chauffeur
        io.emit(`ride_accepted_${ride[0].passenger_id}`, {
            ride_id,
            driver_id: req.user.user_id,
            message: "Votre trajet a été accepté !",
        });

        res.json({ message: "Trajet accepté avec succès !" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🔹 3. Annuler un trajet (passager ou chauffeur)
router.post("/cancel/:ride_id", authMiddleware, async (req, res) => {
    try {
        const { ride_id } = req.params;
        const { reason } = req.body;
        const user_id = req.user.user_id;

        const [ride] = await db.query("SELECT * FROM rides WHERE ride_id = ?", [ride_id]);

        if (ride.length === 0) {
            return res.status(404).json({ message: "Trajet non trouvé." });
        }

        const rideData = ride[0];

        if (rideData.passenger_id !== user_id && rideData.driver_id !== user_id) {
            return res.status(403).json({ message: "Vous ne pouvez pas annuler ce trajet." });
        }

        await db.query("UPDATE rides SET status = 'canceled' WHERE ride_id = ?", [ride_id]);

        // 🔥 Notification WebSocket : Annulation d’un trajet
        if (rideData.passenger_id === user_id) {
            io.emit(`ride_canceled_${rideData.driver_id}`, {
                ride_id,
                message: "Le passager a annulé le trajet.",
            });
        } else {
            io.emit(`ride_canceled_${rideData.passenger_id}`, {
                ride_id,
                message: "Le chauffeur a annulé le trajet.",
            });
        }

        res.json({ message: "Trajet annulé avec succès." });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🔹 4. Mettre à jour le statut d’un trajet
router.post("/update/:ride_id", authMiddleware, async (req, res) => {
    try {
        const { status } = req.body;
        const { ride_id } = req.params;
        const allowedStatuses = ["in_progress", "completed", "canceled"];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ message: "Statut invalide." });
        }

        const [ride] = await db.query("SELECT * FROM rides WHERE ride_id = ?", [ride_id]);

        if (ride.length === 0) {
            return res.status(404).json({ message: "Trajet non trouvé." });
        }

        await db.query("UPDATE rides SET status = ? WHERE ride_id = ?", [status, ride_id]);

        // 🔥 Notification WebSocket : Mise à jour du statut du trajet
        io.emit(`ride_status_${ride[0].passenger_id}`, {
            ride_id,
            status,
            message: `Le statut de votre trajet est maintenant : ${status}`,
        });

        res.json({ message: `Le statut du trajet a été mis à jour à '${status}'.` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🔹 5. Voir ses trajets (passager ou chauffeur)
router.get("/my-rides", authMiddleware, async (req, res) => {
    try {
        const [rides] = await db.query(
            "SELECT * FROM rides WHERE passenger_id = ? OR driver_id = ? ORDER BY created_at DESC",
            [req.user.user_id, req.user.user_id]
        );

        if (rides.length === 0) {
            return res.status(404).json({ message: "Aucun trajet trouvé." });
        }

        res.json(rides);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🔹 6. Récupérer un trajet spécifique par son ID
router.get("/:ride_id", authMiddleware, async (req, res) => {
    try {
        const { ride_id } = req.params;
        const [ride] = await db.query("SELECT * FROM rides WHERE ride_id = ?", [ride_id]);

        if (ride.length === 0) {
            return res.status(404).json({ message: "Trajet non trouvé." });
        }

        res.json(ride[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🔹 7. Noter un trajet (passager et chauffeur)
router.post("/rate/:ride_id", authMiddleware, async (req, res) => {
    try {
        const { ride_id } = req.params;
        const { rating, comment } = req.body;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ message: "La note doit être entre 1 et 5 étoiles." });
        }

        const [ride] = await db.query("SELECT * FROM rides WHERE ride_id = ?", [ride_id]);

        if (ride.length === 0) {
            return res.status(404).json({ message: "Trajet non trouvé." });
        }

        if (ride[0].status !== "completed") {
            return res.status(400).json({ message: "Vous ne pouvez noter que les trajets terminés." });
        }

        let ratedUserId;
        let reviewerType;
        if (req.user.user_id === ride[0].passenger_id) {
            ratedUserId = ride[0].driver_id;
            reviewerType = "passenger";
        } else if (req.user.user_id === ride[0].driver_id) {
            ratedUserId = ride[0].passenger_id;
            reviewerType = "driver";
        } else {
            return res.status(403).json({ message: "Vous ne pouvez noter que les trajets que vous avez effectués." });
        }

        await db.query(
            "INSERT INTO reviews (ride_id, reviewer_id, rated_user_id, rating, comment, reviewer_type) VALUES (?, ?, ?, ?, ?, ?)",
            [ride_id, req.user.user_id, ratedUserId, rating, comment, reviewerType]
        );

        // 🔥 Mettre à jour la moyenne des notes du chauffeur/passager
        const [averageRating] = await db.query(
            "SELECT AVG(rating) as avg_rating FROM reviews WHERE rated_user_id = ?",
            [ratedUserId]
        );

        await db.query("UPDATE users SET average_rating = ? WHERE user_id = ?", [
            averageRating[0].avg_rating,
            ratedUserId,
        ]);

        res.json({ message: "Avis ajouté avec succès !" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🔹 8. Voir les avis d'un utilisateur
router.get("/reviews/:user_id", authMiddleware, async (req, res) => {
    try {
        const { user_id } = req.params;

        const [reviews] = await db.query(
            "SELECT r.rating, r.comment, r.reviewer_type, u.full_name AS reviewer_name FROM reviews r INNER JOIN users u ON r.reviewer_id = u.user_id WHERE r.rated_user_id = ? ORDER BY r.created_at DESC",
            [user_id]
        );

        if (reviews.length === 0) {
            return res.status(404).json({ message: "Aucun avis trouvé pour cet utilisateur." });
        }

        res.json(reviews);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


module.exports = router;
