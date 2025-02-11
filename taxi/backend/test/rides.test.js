const request = require("supertest");
const { app, server } = require("../server");
jest.setTimeout(30000);

let token, rideId;

describe("🔹 Gestion des trajets", () => {
    beforeAll(async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({ identifier: "testuser@example.com", password: "password123" });

        token = res.body.accessToken;
    });

    test("✅ Création d'un trajet", async () => {
        const res = await request(app)
            .post("/api/rides/create")
            .set("Authorization", `Bearer ${token}`)
            .send({
                pickup_location: "Paris",
                dropoff_location: "Lyon",
                fare: 50.00
            });

        expect(res.statusCode).toBe(201);
        rideId = res.body.ride_id;
    });

    test("✅ Annulation d'un trajet", async () => {
        const res = await request(app)
            .post(`/api/rides/cancel/${rideId}`)
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
    });
});

afterAll(() => server.close());
