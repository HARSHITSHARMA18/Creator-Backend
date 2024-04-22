import { Router } from "express";
import { registerUser } from "../controllers/user.controllers.js";

import {upload} from "../middlewares/multer.middleware.js"

const router = Router()


// user register route
router.route("/register").post(
    
    // Upload images (avatar and coverImage) using multer

    upload.fields([
        //1st Image
        {

            name:"avatar",
            maxCount:1
        },

        //2nd Image
        {
           name: "coverImage",
           maxCount:1

        }
    ]),

    
    registerUser
)



export default router

