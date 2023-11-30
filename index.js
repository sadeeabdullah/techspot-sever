require('dotenv').config()
const express = require('express');
const cors = require('cors');
const app = express()
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;

app.use(express.json())
app.use(cors())






const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ncskwvc.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();



    const userCollection = client.db("techspot").collection("users")
    const productsCollection = client.db("techspot").collection("Products")
    const reviewsCollection = client.db("techspot").collection("reviews")


     // jwt related api
     app.post( '/jwt', async( req, res ) => {
        const user = req.body;
        const token = jwt.sign(
          user,
          process.env.ACCESS_TOKEN_SECRET,{
            expiresIn: '1h'
          }
        )
        res.send( { token } )
      })


         // all method here

    // users related api

    // posting user doc
    app.post( '/users', async( req, res ) => {
      
        const user = req.body;
        // insert email if user doesnot exist
        // you can do this in many ways( 1.email unique, 2.upsert, 3. simple checking)
        const query = { email: user.email}
        const existingUser = await userCollection.findOne(query)
        if(existingUser){
          return res.send({ message: 'user  already exist', insertedId: null})
        }
        const result = await userCollection.insertOne(user);
        res.send(result)
      })
  
      // MIDDLEWARES TO VERIFY TOKEN
      const verifyToken = (req, res, next) =>{
        console.log('inside verify token ',req?.headers)
        if(!req?.headers?.authorization){
          return res.status(401).send( { message: "unauthorized access" } )
        }
        const token = req.headers?.authorization.split(' ')[1];
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET,( err, decoded ) => {
          if(err){
            return res.status(401).send({ message: 'unauthorized Acces' })
          }
          req.decoded = decoded;
          next();
        })
      }

    //   verify moderator middleware

      const verifyModerator = async(req,res,next) =>{
        const email = req.decoded.email;
        const query = { email: email};
        const user = await userCollection.findOne(query)
        const isModerator = user?.role === 'moderator';
        if (!isModerator) {
            return res.status(403).send({ message: 'forbidden access'})
        }
        next();
      }



       // middleware to verify admin
       const verifyAdmin = async( req, res, next ) =>{
        const email = req.decoded.email;
        const query = { email  :  email };
        const user = await userCollection.findOne(query);
        const isAdmin = user?.role === 'admin';
        if(!isAdmin){
          return res.status(403).send({ message: 'forbidden access' });
        }
        next();
      }






       // verify its admin or not
    app.get('/users/userRole/:email',verifyToken,async( req,res ) =>{
      const email = req.params.email;
      if( email !== req?.decoded?.email){
        return res.status(403).send({ message: ' forbidden access' })
      }
      const role = {projection:{_id:0,role:1}}
      const query = { email: email};
      const user = await userCollection.findOne(query,role)
      res.send(user)
    })
     



       // getting all the user data
    app.get( '/users',verifyToken,verifyAdmin, async( req, res ) => {
      
      const result = await userCollection.find().toArray();
      res.send(result)
    })


    // making moderator and admin
    app.patch('/users/admin/:id',verifyToken,verifyAdmin, async( req, res ) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id)};
      const options = {
        upsert: true
      }
      const updatedDoc={
        $set:{
          role: 'admin'
        }
      }
      const result = await userCollection.updateOne(filter,updatedDoc,options)
      res.send(result)
    })
    app.patch('/users/moderator/:id',verifyToken,verifyAdmin, async( req, res ) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id)};
      const options = {
        upsert: true
      }
      const updatedDoc={
        $set:{
          role: 'moderator'
        }
      }
      const result = await userCollection.updateOne(filter,updatedDoc,options)
      res.send(result)
    })






    // product collection get and post method here

    app.get('/products',async(req,res)=>{
      const result = await productsCollection.find().toArray();
      res.send(result)
    })
    app.get('/productDetails/:id',async(req,res) =>{
      const id = req.params.id;
      const query ={_id:new ObjectId(id)};
      const result = await productsCollection.findOne(query);
      res.send(result)
    })

    app.patch('/products/:id', async(req,res)=>{
      const id = req.params.id;
      console.log(id)
      const item = req.body
      console.log(item.upvotePlus)
      const filter = { _id: new ObjectId(id) };
      const updatedDoc={
        $set:{
          upvoteCount: item.upvotePlus
        }
      }
      const result = await productsCollection.updateOne(filter,updatedDoc)
      res.send(result)
    })



    // reviews here

    app.post('/reviews',async(req,res)=>{
      const review = req.body;
      const result = await reviewsCollection.insertOne(review)
      res.send(result)
  })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);












app.get('/', async( req,res)=>{
    res.send('tech spot is running')

})

app.listen(port,()=>{
    console.log(`tech spot is running on port${port}`)
})