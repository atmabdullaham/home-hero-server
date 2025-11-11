const express = require('express');
const cors = require('cors');
const admin = require("firebase-admin");
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config()

const serviceAccount = require("./firebase-admin-key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


const app = express()
const port = process.env.PORT || 3000;

// middleware
app.use(cors());
app.use(express.json())

const verifyFirebaseToken = async(req, res, next)=>{
const authorization = req.headers.authorization;
if(!authorization){
  return res.status(401).send({message: "unauthorized access"})
}
const token = authorization.split(' ')[1];
try{
  const decoded = await admin.auth().verifyIdToken(token)
  req.token_email = decoded.email;
  next()
}catch(error){
  return res.status(401).send({message: "unauthorized access"})
}
// next
}

const uri = `mongodb+srv://${process.env.db_admin}:${process.env.db_pass}@cluster0.a41jis3.mongodb.net/?appName=Cluster0`;

app.get('/', (req, res)=>{
    res.send("Hello word")
})
 
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
    try {
      await client.connect();
     const database = client.db('home_hero');
     const servicesCollection  = database.collection('services');
     const bookingsCollection  = database.collection('bookings');

     app.post("/services", verifyFirebaseToken, async(req, res)=>{
      const service = req.body;
      const result = await servicesCollection.insertOne(service)
      res.send(result)
     })

     app.get("/my-services", verifyFirebaseToken, async(req,res)=>{
      const email = req.query.email;
      const query = {};
      if(email){
        query.email = email;
        if(email !== req.token_email){
          return res.status(403).send({message: 'forbidden access'})
        }
      }
      const result = await servicesCollection.find(query).toArray()
      res.send(result)
     })
     app.get("/services",  async(req,res)=>{
    
      const result = await servicesCollection.find().toArray()
      res.send(result)
     })
     
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    
  }
}
run().catch(console.dir);


app.listen(port, ()=>{
    console.log(   `Server is running on port ${port}`);
})
