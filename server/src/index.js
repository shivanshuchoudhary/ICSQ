import http from 'http'
import connectDB from './db/index.js';
import { app } from './app.js';
import redis from 'redis'
import './config/envLoader.cjs'

const server = http.createServer(app);

process.on("uncaughtException", (err) => {
    console.log("UNCAUGHT EXCEPTION! 💥 Shutting down...");
    console.log(err.name, err.message);
    process.exit(1);
  });

const port = process.env.PORT || 8080;

connectDB()
.then(()=>{
    server.listen(port, ()=>{
        console.log(`Server listening on port : ${port}`);
    })
})
.catch((err)=> {
    console.log("Database Connection Failed !!!",err);
})

const redisClient = redis.createClient({
  url: process.env.REDIS_URL
})

// const redisClient = redis.createClient({
//   username: 'default',
//   password: process.env.REDIS_PASS,
//   socket: {
//       host: 'redis-18426.crce182.ap-south-1-1.ec2.redns.redis-cloud.com',
//       port: 13229
//   }
// });

redisClient.on('connect', () => {
  console.log('Connected to Redis');
});

redisClient.on('error', (err) => {
  console.error('Redis Connection error : ',err);
});

// await redisClient.connect();

process.on("unhandledRejection", (err) => {
  console.log("UNHANDLED REJECTION! 💥 Shutting down...");
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

export {redisClient}