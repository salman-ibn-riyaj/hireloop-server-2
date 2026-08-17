const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());


const port = process.env.PORT;
const MONGODB_URI = process.env.MONGODB_URI;
const client = new MongoClient(MONGODB_URI);

let db;

async function connectDB() {
    try {
        await client.connect();
        const db = client.db('hireloop');
        const jobsCollection = db.collection('jobs');

        app.post('/api/jobs', async (req, res) => {
            const job = req.body;
            const result = await jobsCollection.insertOne(job);
            res.send(result);

        });

        app.get('/api/jobs', async (req, res) => {
            const query = {}
            if(req.query.companyId){
                query.companyId = req.query.companyId;
            }
            if(req.query.staus){
                query.status = req.query.status;
            }
            const cursor = jobsCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        })


        console.log('MongoDB connected');
    } catch (err) {
        console.log('MongoDB error:', err.message);
    }
}


connectDB();

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Server running on port ${port}`)
})