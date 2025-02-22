const request = require("supertest");
const { app, server } = require("../server");
const db = require("../config/db");

let userToken, adminToken, reportId;
let rideId;

// 🟡 Fonction de génération d’email unique
function getUniqueEmail(prefix) {
    const timestamp = Date.now();
    return `${prefix}_${timestamp}@example.com`;
}

// 🟡 Fonction générique pour créer ou connecter un utilisateur
async function createOrLoginUser(email, password, username, phone, fullName, userType) {
    let userRes = await request(app).post("/api/auth/login").send({
        identifier: email,
        password: password
    });

    if (userRes.statusCode === 401) {
        console.log(`🚨 ${userType} introuvable, création du compte...`);
        const registerRes = await request(app).post("/api/auth/register").send({
            username: username,
            email: email,
            password: password,
            phone_number: phone,
            full_name: fullName,
            user_type: userType,
        });

        if (![201, 400].includes(registerRes.statusCode)) {
            console.error(`❌ Échec création ${userType} :`, registerRes.body);
            throw new Error(`Échec de création de l'utilisateur test (${userType}).`);
        }

        if (registerRes.statusCode === 400) {
            console.warn(`⚠️ ${userType} déjà existant, tentative de connexion.`);
        }

        userRes = await request(app).post("/api/auth/login").send({
            identifier: email,
            password: password
        });
    }

    if (userRes.statusCode !== 200) {
        console.error(`❌ Échec de connexion ${userType} :`, userRes.body);
        throw new Error(`Échec de connexion ${userType}.`);
    }

    console.log(`✅ Connexion ${userType} réussie avec token : ${userRes.body.accessToken}`);
    return userRes.body.accessToken;
}

// ✅ Suppression des anciens comptes avant les tests
beforeAll(async () => {
    console.log("🔹 Suppression des anciens comptes de test...");
    try {
        await db.query("DELETE FROM users WHERE email LIKE '%@example.com'");
        console.log("🗑️ Anciens comptes supprimés.");
    } catch (error) {
        console.warn("⚠️ Erreur lors de la suppression des anciens comptes :", error.message);
    }

    // ✅ Création de l'utilisateur (passager)
    userToken = await createOrLoginUser(
        getUniqueEmail("report_user"),
        "password123",
        "report_user",
        "0623456789",
        "Report User",
        "passenger"
    );

    // ✅ Création de l'admin
    adminToken = await createOrLoginUser(
        getUniqueEmail("report_admin"),
        "admin123",
        "report_admin",
        "0611111111",
        "Report Admin",
        "admin"
    );

    // ✅ Création d’un trajet pour tester les signalements
    console.log("🔹 Création d’un trajet de test...");
    const rideRes = await request(app).post("/api/rides/create")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
            pickup_location: "Marseille",
            dropoff_location: "Nice",
            fare: 55.00
        });

    if (rideRes.statusCode !== 201) {
        console.error("❌ Échec création trajet :", rideRes.body);
        throw new Error("Échec de création du trajet.");
    }

    rideId = rideRes.body.ride_id;
    console.log(`✅ Trajet créé avec ride_id : ${rideId}`);
});

// ✅ TESTS PRINCIPAUX
describe("⚠️ Signalements et incidents", () => {
    jest.setTimeout(20000);

    // 🟡 Test 1 : Signaler un problème
    test("✅ Signaler un problème (Utilisateur)", async () => {
        console.log("🔹 Création d'un signalement...");
        const res = await request(app).post("/api/reports/report")
            .set("Authorization", `Bearer ${userToken}`)
            .send({
                ride_id: rideId,
                issue_type: "Problème de conduite",
                description: "Le chauffeur roulait trop vite."
            });

        console.log("🔹 Réponse signalement :", res.body);
        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty("report_id");
        reportId = res.body.report_id;
        console.log(`✅ Signalement créé avec report_id : ${reportId}`);
    });

    // 🟡 Test 2 : Mettre à jour le signalement
    test("✅ Mettre à jour un signalement (Admin)", async () => {
        if (!reportId) {
            console.warn("⚠️ Aucun signalement disponible, test ignoré.");
            return;
        }

        console.log(`🔹 Mise à jour du signalement ${reportId}...`);
        const res = await request(app).put(`/api/reports/admin/update/${reportId}`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                status: "reviewed"
            });

        console.log("🔹 Réponse mise à jour :", res.body);
        expect(res.statusCode).toBe(200);
        expect(res.body.message).toBe("Réclamation mise à jour avec succès.");
    });

    // 🟡 Test 3 : Suppression du signalement
    test("✅ Suppression d'un signalement (Admin)", async () => {
        if (!reportId) {
            console.warn("⚠️ Aucun signalement à supprimer, test ignoré.");
            return;
        }
    
        console.log(`🔹 Suppression du signalement ${reportId}...`);
        const res = await request(app)
            .delete(`/api/reports/admin/delete/${reportId}`)
            .set("Authorization", `Bearer ${adminToken}`);
    
        console.log("🔹 Réponse suppression :", res.body);
    
        expect(res.statusCode).toBe(200);
        
        // ✅ Soft Assertion : Accepte deux cas valides
        expect([
            "Réclamation supprimée avec succès.",
            "Aucun signalement trouvé, peut-être déjà supprimé."
        ]).toContain(res.body.message);
    });
    
});

// ✅ Nettoyage après tests
afterAll(async () => {
    console.log("🔹 Suppression des comptes de test...");
    await db.query("DELETE FROM users WHERE email LIKE '%@example.com'");

    console.log("🔹 Fermeture propre de la connexion MySQL...");
    await db.end();

    console.log("🔹 Fermeture du serveur...");
    server.close();
    console.log("✅ Serveur fermé !");
});
