const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

router.get("/profile", authMiddleware, (req, res) => {
    res.json({ message: "Bienvenue sur ton profil !", user: req.user });
});

module.exports = router;
