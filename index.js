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
        const companyCollection = db.collection('companies');
        const usersCollection = db.collection('user');

        app.post('/api/jobs', async (req, res) => {
            const job = req.body;
            const newJob = {
                ...job,
                createdAt: new Date()
            }
            const result = await jobsCollection.insertOne(newJob);
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

        app.get('/api/users', async (req, res) => {
            const cursor = usersCollection.find();
            const result = await cursor.toArray();
            res.send(result)
        })

        // Company related APIs
        app.post('/api/companies', async (req, res) => {
            const company = req.body;
            const newCompany = {
                ...company,
                createdAt: new Date()
            }
            const result = await companyCollection.insertOne(newCompany);
            res.send(result);
        })

        app.get('/api/companies', async(req, res) => {
            const cursor = companyCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        })

        app.get ('/api/my/company', async (req, res) => {
            const query = {}
            
            if(req.query.recruiterId){
                query.recruiterId = req.query.recruiterId
            }

            const result = await companyCollection.findOne(query)

            res.send(result)
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