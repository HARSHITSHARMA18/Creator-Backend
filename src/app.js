import express from "express";

import cors from "cors"
import cookieParser from "cookie-parser";

const app = express()

// use method for configurations and middlewares
app.use(cors({
    origin : process.env.CORS_ORIGIN,
    credentials: true
}))

// JSON configuration for the server
app.use(express.json({limit:"16kb"}))

// URL comfiguration for the server
app.use(express.urlencoded({extended:true, limit:"16kb"}))

// Public image comfigurations
app.use(express.static("public"))

// To perform CRUD operations on cookies in user browser by server securely
app.use(cookieParser())





// routes import
import userRouter from "./routes/user.routes.js"
import videoRouter from "./routes/video.routes.js"

//routes declaration
// app.use("/users", userRouter)
app.use("/api/v1/users",userRouter)

app.use("/api/v1/videos", videoRouter)  



export { app }