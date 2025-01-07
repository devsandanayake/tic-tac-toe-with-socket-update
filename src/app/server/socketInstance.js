const http = require('http');
const io = require('socket.io')({
    cors: {
        origin: "*", // Allow requests from this origin
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket) => {
    console.log('A user connected');


    socket.on('joinGame', (gameRoomId) => {
        console.log(`User attempting to join game room: ${gameRoomId}`);
        const room = io.sockets.adapter.rooms.get(gameRoomId);
        const numClients = room ? room.size : 0;
         
        if (numClients === 0) {
            socket.join(gameRoomId);
            socket.emit('gameJoined', { gameRoomId });
            console.log(`User created and joined game room: ${gameRoomId}`);
        } else if (numClients === 1) {
            socket.join(gameRoomId);
            socket.emit('gameJoined', { gameRoomId });
            io.to(gameRoomId).emit('userJoined', { userId: socket.id });
            console.log(`User joined game room: ${gameRoomId}`);
        } else {
            socket.emit('error', 'Game is already full');
        }
    });

    socket.on('move', (data) => {
        const { gameRoomId, index, symbol } = data;
        const room = io.sockets.adapter.rooms.get(gameRoomId);

        if (room) {
            io.to(gameRoomId).emit('move', data);
            console.log(`Move in game room ${gameRoomId}: ${index} ${symbol}`);
        } else {
            socket.emit('error', 'Invalid game room ID');
        }
    });

    socket.on('resetGame', (gameRoomId) => {
        const room = io.sockets.adapter.rooms.get(gameRoomId);

        if (room) {
            io.to(gameRoomId).emit('resetGame');
            console.log(`Reset game room: ${gameRoomId}`);
        } else {
            socket.emit('error', 'Invalid game room ID');
        }
    });

    socket.on('disconnect', () => {
        const rooms = Array.from(socket.rooms);
        rooms.forEach((room) => {
            if (room !== socket.id) {
                io.to(room).emit('userDisconnected', { userId: socket.id });
                console.log(`User disconnected from room: ${room}`);
            }
        });
        console.log('A user disconnected');
    });
});

module.exports = { io };