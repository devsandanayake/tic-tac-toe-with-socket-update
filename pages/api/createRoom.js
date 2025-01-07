import { v4 as uuidv4 } from 'uuid';

export default function handler(req, res) {
    if (req.method === 'POST') {
        const { room, players } = req.body;
        if (!room || !players || players.length !== 2) {
            return res.status(400).json({ error: 'Room and two players are required' });
        }

        const { name: roomName, gameSessionUuid } = room;
        const [player1, player2] = players;

        if (!roomName || !gameSessionUuid || !player1.name || !player2.name) {
            return res.status(400).json({ error: 'Room name, game session UUID, and both player names are required' });
        }

        // const gameRoomId = gameSessionUuid;
        // const gameLink = `http://localhost:3000/game/${gameRoomId}`;

        // Here you would typically save the game room details to a database
        const result = { insertedId: uuidv4() }; // Mocking database insertion result
        const modifiedData = {
            gameSessionUuid,
            players,
            cleatedDate: new Date().toISOString()
        };

        const response = {
            status: true,
            message: 'success',
            payload: {
                gameSessionUuid: modifiedData.gameSessionUuid,
                gameStateId: result.insertedId,
                name: modifiedData.gameSessionUuid,
                createDate: modifiedData.cleatedDate,
                link1: `http://144.126.243.236:3002/game/${modifiedData.gameSessionUuid}`,
            }
        };

        return res.status(200).json(response);
    } else {
        return res.status(405).json({ error: 'Method not allowed' });
    }
}