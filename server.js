const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(cors());

const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.get("/create-lobby", (req, res) => {
    const lobbyId = uuidv4(); // Generate unique lobby ID
    activeLobbies[lobbyId] = [];
    res.json({ lobbyId });
});

const activeLobbies = {};

io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("join-lobby", (lobbyId) => {
        if (!activeLobbies[lobbyId]) return;
        activeLobbies[lobbyId].push(socket.id);

        socket.join(lobbyId);
        console.log(`User ${socket.id} joined lobby ${lobbyId}`);

        if (activeLobbies[lobbyId].length === 2) {
            io.to(lobbyId).emit("start-game");
        }
    });
    socket.on("disconnect", () => {
        for (const [lobbyId, players] of Object.entries(activeLobbies)) {
            if (players.includes(socket.id)) {
                activeLobbies[lobbyId] = players.filter((id) => id !== socket.id);
                if (activeLobbies[lobbyId].length === 0) delete activeLobbies[lobbyId];
            }
        }
        console.log("User disconnected:", socket.id);
    });
});

server.listen(3000, () => {
    console.log("Server running on port 3000");
});
