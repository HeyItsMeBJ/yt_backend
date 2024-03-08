import dotenv from "dotenv";
import connectDb from "./db/index.js";


dotenv.config({ path: "./env" });
connectDb()









// we use this function to connect the database but we make this is db folder to make code  modular and easy to understand.
// import mongoose from "mongoose";
// import { DB_NAME } from "./constant";
// ;(
//     async()=>{
//         try {
//             await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
//         } catch (error) {
//             console.log("error: ", error)
//             throw error
//         }
        
//     }
// )()