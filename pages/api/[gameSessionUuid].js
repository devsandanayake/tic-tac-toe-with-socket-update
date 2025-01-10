import { MongoClient } from 'mongodb';

const uri = 'mongodb+srv://dev:1234@mernapp.zwstxds.mongodb.net/?retryWrites=true&w=majority&appName=mernApp'; // Replace with your MongoDB connection string
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

export default async function handler(req, res) {
    if (req.method === 'GET') {
        const { gameSessionUuid } = req.query;

       

        if (!gameSessionUuid) {
            return res.status(400).json({ error: 'gameSessionUuid is required' });
        }

        try {
            await client.connect();
            const database = client.db('tic-tac-toe'); // Replace with your database name
            const collection = database.collection('rooms');

            const gameRoom = await collection.findOne({ gameSessionUuid });

            if (!gameRoom) {
                return res.status(404).json({ error: 'Game room not found' });
            }

            return res.status(200).json(gameRoom);
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