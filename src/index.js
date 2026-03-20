import dotenv from 'dotenv';
import connectDB from "./db/index.js";
import express from "express";

dotenv.config({
    path: "./.env"
});

const app = express();

app.listen(process.env.PORT, async () => {
    console.log(`Server is running on port ${process.env.PORT}`);
    await connectDB();
});


