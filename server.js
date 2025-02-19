const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const crypto = require("crypto");
const fs = require('fs');
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

let problems = [];
fs.readFile("problems.json", "utf8", (err, data) => {
    if (err) {
        console.error("Error reading problems.json:", err);
    } else {
        problems = JSON.parse(data);  // Parse the JSON data into an object
    }
});

const lobbyAnswers = {};

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
            const randomProblem = problems[Math.floor(Math.random() * problems.length)];
            io.to(lobbyId).emit("start-game", { problem: randomProblem, fileUrl: randomProblem.file, download: randomProblem.download });

            lobbyAnswers[lobbyId] = randomProblem.answer;
            
        }
    });

    socket.on("submit-answer", (lobbyId, answer) => {
        if (lobbyAnswers[lobbyId] && lobbyAnswers[lobbyId].toLowerCase() === answer.toLowerCase()) {
            // The current player is the winner
            io.to(lobbyId).emit("game-over", {
                winner: socket.id,
                message: "Congratulations, you won!"
            });
    
            // Find the other player (the loser)
            const playersInLobby = activeLobbies[lobbyId];
            const otherPlayerId = playersInLobby.find(id => id !== socket.id);
    
            // Send the loser a "You lost" message
            if (otherPlayerId) {
                io.to(otherPlayerId).emit("game-over", {
                    winner: socket.id,
                    message: "You lost, better luck next time!"
                });
            }
    
            delete lobbyAnswers[lobbyId]; // End the game by removing the stored answer
        } else {
            socket.emit("incorrect-answer", { message: "Incorrect answer, try again!" });
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
