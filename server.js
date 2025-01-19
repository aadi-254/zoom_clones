const http = require("http");
const express = require("express");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Socket.io
io.on("connection", (socket) => {
    console.log('A user connected:', socket.id);

    // Send a message to the client upon connection
    let message = "connect";
    socket.emit("message", message);


    socket.on('chat message', (data) => {
        console.log('Message from ' + data.user + ': ' + data.msg);
        io.emit('chat message', data);
    });
    // Store the peer ID when received
    socket.on("id-got", (peerid) => {
        console.log('Peer ID received:', peerid);
        socket.peerid = peerid; // Store the peer ID in the socket object
        socket.broadcast.emit("id", peerid);
    });

    // Handle disconnection
    socket.on("disconnect", (reason) => {
        console.log(`User  disconnected: ${socket.peerid}, Reason: ${reason}`);
        // Notify other users that this user has disconnected using the peer ID
        if (socket.peerid) {
            io.emit("user-disconnected", socket.peerid);
        } else {
            console.log("No peer ID found for disconnected user.");
        }
    });
});

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

app.get("/", (req, res) => {
    return res.sendFile(path.join(__dirname, 'public', 'index.htm'));
});

server.listen(9000, () => console.log(`Server Started at PORT: 9000`));
