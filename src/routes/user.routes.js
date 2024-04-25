import { Router } from "express";
import { registerUser, loginUser, logoutUser, refreshAccessToken } from "../controllers/user.controllers.js";

import {upload} from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";

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

//user login route
router.route("/login").post(loginUser)

//SECURED ROUTES

//user logout 
router.route("/logout").post(
    verifyJWT,
    logoutUser
)

// new token generation
router.route("/refresh-token").post(refreshAccessToken)




export default router

