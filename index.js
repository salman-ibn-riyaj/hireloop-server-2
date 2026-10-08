const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());


const port = process.env.PORT;
const MONGODB_URI = process.env.MONGODB_URI;
const client = new MongoClient(MONGODB_URI);

let db;


const myLogger = function (req, res, next) {
    console.log('middleware logger logged', req.params);
    next();
};

const verifyToken = (req, res, next) =>{
    console.log('verifyToken middleware', req.headers);
    next()
}

async function connectDB() {
    try {
        await client.connect();
        const db = client.db('hireloop');
        const jobsCollection = db.collection('jobs');
        const companyCollection = db.collection('companies');
        const usersCollection = db.collection('user');
        const applicationsCollection = db.collection('applications');
        const planCollection = db.collection('plans');
        const subscriptionCollection = db.collection('subscriptions')

        app.post('/api/jobs', async (req, res) => {
            const job = req.body;
            const newJob = {
                ...job,
                createdAt: new Date()
            }
            const result = await jobsCollection.insertOne(newJob);
            res.send(result);

        });

        // Application related APIs
        app.get('/api/applications', async (req, res) => {
            const query = {}
            if (req.query.applicantId) {
                query.applicantId = req.query.applicantId
            }
            if (req.query.jobId) {
                query.jobId = req.query.jobId
            }

            const cursor = applicationsCollection.find(query);
            const result = await cursor.toArray();
            res.send(result)
        })

        app.post('/api/applications', async (req, res) => {
            const application = req.body;
            const newApplication = {
                ...application,
                createdAt: new Date()
            }
            const result = await applicationsCollection.insertOne(newApplication);
            res.send(result);
        })

        app.post('/api/subscriptions', async (req, res) => {
            const data = req.body
            const subsInfo = {
                ...data,
                createdAt: new Date()
            }

            const result = await subscriptionCollection.insertOne(subsInfo)
            res.send(result);

            // update subscriber data

            const filter = { email: data.email }

            const updateDocument = {
                $set: {
                    plan: data.planId,
                },
            };

            const updatedResult = await usersCollection.updateOne(filter, updateDocument)
            res.send(updatedResult);


        })

        app.patch('/api/companies/:id', myLogger, verifyToken, async (req, res) => {
            const id = req.params.id;
            const updatedCompany = req.body;
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    status: updatedCompany.status
                }
            }
            const result = await companyCollection.updateOne(filter, updateDoc)
            res.send(result)
        })



        // app.get('/api/jobs', async (req, res) => {
        //     const query = {}
        //     if(req.query.companyId){
        //         query.companyId = req.query.companyId;
        //     }
        //     if(req.query.staus){
        //         query.status = req.query.status;
        //     }
        //     const cursor = jobsCollection.find(query).skip(6);
        //     const result = await cursor.toArray();
        //     res.send(result);
        // })
        app.get('/api/jobs', async (req, res) => {
            try {
                const { search, category, type, isRemote, companyId, status } = req.query;

                // Base query
                const query = {};

                // 1. Text search on title, companyName, or location
                if (search) {
                    query.$or = [
                        { title: { $regex: search, $options: 'i' } },
                        { companyName: { $regex: search, $options: 'i' } },
                        { location: { $regex: search, $options: 'i' } }
                    ];
                }

                // 2. Exact match filters
                if (category) {
                    query.category = category;
                }

                if (type) {
                    query.type = type;
                }

                if (isRemote === 'true') {
                    query.isRemote = true;
                }

                if (companyId) {
                    query.companyId = companyId;
                }

                // 3. Status filter (default to 'active' if not specified)
                if (status) {
                    query.status = status;
                } else {
                    query.status = 'active';
                }

                // Fetch matching jobs sorted by latest
                const result = await jobsCollection
                    .find(query)
                    .sort({ createdAt: -1 })
                    .toArray();

                res.send(result);
            } catch (error) {
                console.error('Failed to fetch jobs:', error);
                res.status(500).send({ message: 'Internal Server Error' });
            }
        });

        app.get(`/api/jobs/:id`, async (req, res) => {
            const id = req.params.id;
            const query = {
                _id: new ObjectId(id)
            }

            const result = await jobsCollection.findOne(query);
            res.send(result);
        })

        app.get('/api/users', async (req, res) => {
            const cursor = usersCollection.find();
            const result = await cursor.toArray();
            res.send(result)
        })

        app.get('/api/plans', async (req, res) => {
            const query = {}
            if (req.query.plan_id) {
                query.id = req.query.plan_id
            }
            const plan = await planCollection.findOne(query)
            res.send(plan)
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

        // app.get('/api/companies', async (req, res) => {
        //     const cursor = companyCollection.find();
        //     const result = await cursor.toArray();
        //     res.send(result);
        // })

        // inefficient way to Agrregate
        app.get('/api/companies', async (req, res) => {
            const cursor = companyCollection.find();
            const companies = await cursor.toArray();
            for (const company of companies) {
                const filter = {
                    companyId: company._id.toString()
                }

                const jobsCount = await jobsCollection.countDocuments(filter);
                company.jobCount = jobsCount;
            }
            res.send(companies);
        })


        app.get('/api/companies2', async (req, res) => {
            const pipeline = [
                {
                    $skip: 4
                },
                {
                    $limit: 4
                }
            ]

            const cursor = companyCollection.aggregate(pipeline);
            const result = await cursor.toArray();
            res.send(result);

        })

        app.get('/api/stats', async (req, res) => {
            const pipeline = [
                {
                    $group: {
                        _id: '$type',
                        count: { $sum: 1 }
                    }
                },
                {
                    $project: {
                        type: '$_id',
                        _id: 0,
                        count: 1
                    }
                },
                {
                    $sort: { count: 1 }
                }
            ]

            const cursor = jobsCollection.aggregate(pipeline);
            const result = await cursor.toArray();
            res.send(result);
        })


        app.get('/api/my/company', async (req, res) => {
            const query = {}

            if (req.query.recruiterId) {
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