const mysql = require("mysql2/promise");
require("dotenv").config();

// Utiliser la base de test si Jest est en mode test
const databaseName = process.env.NODE_ENV === "test" ? process.env.DB_NAME_TEST : process.env.DB_NAME;

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: databaseName, // ✅ Correction ici
    charset: "utf8mb4"
});

// Vérifier la connexion seulement si on n'est pas en mode test
if (process.env.NODE_ENV !== "test") {
    (async () => {
        try {
            const connection = await db.getConnection();
            console.log(`✅ Connecté à la base de données MySQL (${databaseName}) !`);
            connection.release();
        } catch (error) {
            console.error("❌ Erreur de connexion à MySQL :", error.message);
        }
    })();
}

console.log(`🔍 Base de données utilisée : ${databaseName}`);


module.exports = db;
