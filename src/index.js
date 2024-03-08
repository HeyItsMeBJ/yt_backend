import dotenv from "dotenv";
import connectDb from "./db/index.js";
import { app } from "./app.js";

dotenv.config({ path: "./env" });
connectDb()
  .then(() => {
    app.listen(process.env.PORT || 5000, () =>
      console.log(`Server running on port ${process.env.PORT}`)
    );
  })
  .catch((err)=>console.log('db failed: ', err));



















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
