import { MongoClient } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';

const uri = process.env.MONGODB_URI || 'mongodb+srv://dev:1234@mernapp.zwstxds.mongodb.net/?retryWrites=true&w=majority&appName=mernApp'; // Replace with your MongoDB connection string

let client;
let clientPromise;

if (!uri) {
    throw new Error('Please add your Mongo URI to .env.local');
}

if (process.env.NODE_ENV === 'development') {
    // In development mode, use a global variable so the MongoClient is not constantly recreated
    if (!global._mongoClientPromise) {
        client = new MongoClient(uri);
        global._mongoClientPromise = client.connect();
    }
    clientPromise = global._mongoClientPromise;
} else {
    // In production mode, it's best to not use a global variable
    client = new MongoClient(uri);
    clientPromise = client.connect();
}

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
            const client = await clientPromise;
            const database = client.db('tic-tac-toe'); // Replace with your database name
            const collection = database.collection('rooms');

            const modifiedData = {
                gameSessionUuid,
                name,
                players,
                createdDate: new Date().toISOString()
            };

            const existingRoom = await collection.findOne({ gameSessionUuid });
            if (existingRoom) {
                return res.status(400).json({ error: 'Room with this game session UUID already exists' });
            }

            const result = await collection.insertOne(modifiedData);

            const response = {
                status: true,
                message: 'success',
                payload: {
                    gameSessionUuid: modifiedData.gameSessionUuid,
                    gameStateId: result.insertedId,
                    name: modifiedData.name,
                    createDate: modifiedData.createdDate,
                    link1: `/?gameSessionUuid=${modifiedData.gameSessionUuid}&gameStateId=${result.insertedId}&uuid=${modifiedData.players[0].uuid}`,
                }
            };

            return res.status(200).json(response);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    } else {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
}