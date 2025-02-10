const db = require("../config/db");

async function resetDatabase() {
    console.log("🛠️ Début de la réinitialisation de la base de test...");

    try {
        // 1️⃣ Supprimer et recréer la base de test
        await db.query("DROP DATABASE IF EXISTS taxi_app_test");
        await db.query("CREATE DATABASE taxi_app_test");
        await db.query("USE taxi_app_test");

        console.log("✅ Base de test `taxi_app_test` créée avec succès !");

        // 2️⃣ Récupérer la liste des tables de `taxi_app`
        const [tables] = await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'taxi_app'");

        for (const table of tables) {
            await db.query(`CREATE TABLE taxi_app_test.${table.table_name} LIKE taxi_app.${table.table_name}`);
            
        }

        console.log("✅ Toutes les tables ont été recréées avec succès !");
        console.log("🚀 Base de test `taxi_app_test` prête à être utilisée !");
    } catch (error) {
        console.error("❌ Erreur lors de la création de la base :", error.message);
        throw error;
    }
    
}
afterAll(async () => {
    await db.end();  // 🔥 Fermer proprement la connexion MySQL après les tests
});
module.exports = resetDatabase;
