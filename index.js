const express = require('express');
const cors = require('cors');
const admin = require("firebase-admin");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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

    //  service related apis
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

    //  delete one services
     app.delete("/services/:id", verifyFirebaseToken, async(req, res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id) }
      const result = await servicesCollection.deleteOne(query)
      res.send(result)
     })

    //  to get all services
     app.get("/services", async (req, res) => {
  const { category, search, minPrice, maxPrice } = req.query;

  const query = {};

  if (minPrice !== undefined || maxPrice !== undefined) {
    query.price = {};
    if (minPrice) query.price.$gte = parseFloat(minPrice);
    if (maxPrice) query.price.$lte = parseFloat(maxPrice);
  }

  if (category && category !== "all") {
    query.category = category;
  }

  if (search) {
    query.$or = [
      { service_name: { $regex: search, $options: "i" } },
      { category: { $regex: search, $options: "i" } },
    ];
  }

  const projectFields = { service_name: 1, image_URL: 1, price: 1, description: 1 };

  const result = await servicesCollection.find(query).project(projectFields).toArray();
  res.send(result);
});
    

    //  to get one services
    app.get("/service/:id",  async(req, res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await servicesCollection.findOne(query)
      res.send(result)
    })

    // to update one data
    app.patch("/service-update", verifyFirebaseToken, async(req, res)=>{
      const id = req.query.id;
      const document = req.body;
      const updateDocument = {
        $set:document
      }
      const filter = { _id: new ObjectId(id) };
      const result = await servicesCollection.updateOne(filter, updateDocument);
      res.send(result)
    })

    // to add review
app.patch("/services/:serviceId/reviews", async (req, res) => {
  const { serviceId } = req.params;
  const { userEmail, rating, comment } = req.body;

  const review = {
    userEmail,
    rating,
    comment,
    date: new Date().toISOString(), 
  };


    const result = await servicesCollection.updateOne(
      { _id: new ObjectId(serviceId) },
      {
        $push: { reviews: review }
      }
    );

    res.send({
      success: true,
      modifiedCount: result.modifiedCount,
      message: "Review added successfully"
    });

  
});
app.get("/featured/services", async (req, res) => {
  const limitNum = 6;

  const result = await servicesCollection
    .aggregate([
      {
        $addFields: {
          avgRating: {
            $cond: [
              { $gt: [{ $size: "$reviews" }, 0] },
              { $avg: "$reviews.rating" },
              0
            ]
          }
        }
      },
      {
        $sort: { avgRating: -1 } 
      },
      {
        $limit: limitNum
      },
      {
        $project: {
          service_name: 1,
          image_URL: 1,
          price: 1,
          description: 1,
          avgRating: 1
        }
      }
    ])
    .toArray();

  res.send(result);
});

    // booking related apis
    app.post('/bookings', verifyFirebaseToken, async(req, res)=>{
      const newBooking = req.body;
      const result = await bookingsCollection.insertOne(newBooking);
      res.send(result);
    })

    // 
     app.get("/my-bookings", verifyFirebaseToken, async(req,res)=>{
      const email = req.query.email;
      const query = {};
      if(email){
        query.email = email;
        if(email !== req.token_email){
          return res.status(403).send({message: 'forbidden access'})
        }
      }
      const result = await bookingsCollection.find(query).toArray()
      res.send(result)
     })

     //  delete one bookings
     app.delete("/bookings/:id", verifyFirebaseToken, async(req, res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id) }
      const result = await bookingsCollection.deleteOne(query)
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
