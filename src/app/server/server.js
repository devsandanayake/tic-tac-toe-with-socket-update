// server.js
const { io } = require('./socketInstance');

const PORT = process.env.PORT || 3003;
io.listen(PORT, () => {
    console.log(`WebSocket server listening on port ${PORT}`);
});
