import { MongoClient } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';

const uri = 'mongodb+srv://dev:1234@mernapp.zwstxds.mongodb.net/?retryWrites=true&w=majority&appName=mernApp'; // Replace with your MongoDB connection string
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

export default async function handler(req, res) {
    if (req.method === 'POST') {
        const { room, players } = req.body;
        const { name, gameSessionUuid } = room;

        if (!name || !gameSessionUuid || players.length !== 2 || !players[0].name || !players[1].name) {
            return res.status(400).json({ error: 'Room name, game session UUID, and both player names are required' });
        }

        // Randomly assign 'X' or 'O' to the players
        const symbols = ['X', 'O'];
        const randomIndex = Math.floor(Math.random() * symbols.length);
        players[0].symbol = symbols[randomIndex];
        players[1].symbol = symbols[1 - randomIndex];

        try {
            await client.connect();
            const database = client.db('tic-tac-toe'); // Replace with your database name
            const collection = database.collection('rooms');

            const modifiedData = {
                gameSessionUuid,
                name,
                players,
                createdDate: new Date().toISOString()
            };

            const result = await collection.insertOne(modifiedData);

            const response = {
                status: true,
                message: 'success',
                payload: {
                    gameSessionUuid: modifiedData.gameSessionUuid,
                    gameStateId: result.insertedId,
                    name: modifiedData.name,
                    createDate: modifiedData.createdDate,
                    link1: `/?gameSessionUuid=${modifiedData.gameSessionUuid}?gameStateId=${result.insertedId}&uuid=${modifiedData.players[0].uuid}`,
                }
            };

            return res.status(200).json(response);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Internal Server Error' });
        } finally {
            await client.close();
        }
    } else {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
}