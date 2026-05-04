import mongoose from 'mongoose'
import { SIPOC } from '../models/SIPOC.model.js'

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB database connected !! DB URL : ${connectionInstance.connection.host}`);
        
        // Drop the unique index on SIPOC collection if it exists
        try {
            await SIPOC.collection.dropIndex("department_1")
            console.log("Successfully dropped the unique index on SIPOC collection")
        } catch (err) {
            // Ignore error if index doesn't exist (error code 27)
            if (err.code !== 27) {
                console.error("Error dropping index:", err)
            }
        }
    } catch (error) {
        console.log("MongoDb connection failed!!  : ",error);
        process.exit(1)
    }
}

export default connectDB;
