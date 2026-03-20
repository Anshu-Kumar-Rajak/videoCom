import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";


async function connectDB() {
    try{
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`);
        console.log("MongoDB connected successfully");
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
        throw error;
        // process.exit(1);
    }
}

export default connectDB;