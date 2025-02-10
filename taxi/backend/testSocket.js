const { io } = require("socket.io-client");

// Vérifier si on est en mode test
const PORT = process.env.NODE_ENV === "test" ? 5001 : 5000;

const socket = io(`http://localhost:${PORT}`);

// S'enregistrer comme utilisateur
socket.emit("register", { user_id: 6 });

socket.on("rideStatusChanged", (data) => {
    console.log("🚗 Mise à jour du statut du trajet :", data);
});

// Envoyer une mise à jour de statut après 5 secondes
setTimeout(() => {
    socket.emit("rideStatusUpdate", { ride_id: 1, status: "in_progress" });
}, 5000);
