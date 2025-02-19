const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const crypto = require("crypto");
const uuidv4 = () => crypto.randomUUID();

const app = express();
app.use(cors());

const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const activeLobbies = {}; // Move this above all routes

app.get("/create-lobby", (req, res) => {
    const lobbyId = uuidv4(); // Generate unique lobby ID
    activeLobbies[lobbyId] = []; // Initialize lobby
    res.json({ lobbyId });
});

io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("join-lobby", (lobbyId) => {
        if (!activeLobbies[lobbyId]) {
            socket.emit("error", "Lobby does not exist.");
            return;
        }
        
        if (activeLobbies[lobbyId].length >= 2) {
            socket.emit("error", "Lobby is full.");
            return;
        }

        activeLobbies[lobbyId].push(socket.id);
        socket.join(lobbyId);
        console.log(`User ${socket.id} joined lobby ${lobbyId}`);

        if (activeLobbies[lobbyId].length === 2) {
            io.to(lobbyId).emit("start-game");
        }
    });

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
        for (const [lobbyId, players] of Object.entries(activeLobbies)) {
            if (players.includes(socket.id)) {
                activeLobbies[lobbyId] = players.filter((id) => id !== socket.id);
                if (activeLobbies[lobbyId].length === 0) {
                    delete activeLobbies[lobbyId];
                }
                break; // No need to check other lobbies
            }
        }
    });
});

server.listen(3000, () => {
    console.log("Server running on port 3000");
});
