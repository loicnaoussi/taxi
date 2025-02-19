const jwt = require("jsonwebtoken");
require("dotenv").config();

const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            console.warn("🚫 JWT manquant ou invalide !");
            return res.status(401).json({ message: "Non autorisé, token manquant" });
        }

        const token = authHeader.split(" ")[1];
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified;
        console.log(`✅ Utilisateur authentifié: user_id=${req.user.user_id}`);

        next();
    } catch (error) {
        console.error("🚨 Erreur d'authentification :", error.message);
        return res.status(401).json({ message: "Non autorisé, token invalide" });
    }
};

module.exports = authMiddleware;
