import { Router } from "express";
import { 
    registerUser, 
    loginUser, 
    logoutUser, 
    refreshAccessToken, 
    changeCurrentPassword, 
    getCurrentUser, 
    updateAccountDetails, 
    updateUserAvatar, 
    updateUserCoverImage, 
    getUserChannelProfile, 
    getWatchHistory 
} from "../controllers/user.controllers.js";

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

//Change Password
router.route("/change-password").post(verifyJWT,changeCurrentPassword)

//Current User
router.route("/current-user").get(verifyJWT, getCurrentUser)

//Account Details Update
router.route("/update-account").patch(verifyJWT,updateAccountDetails)

//Avatar Image Update
router.route("/avatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar)


//CoverImage Update
router.route("/coverImage").patch(verifyJWT,upload.single("coverImage"), updateUserCoverImage)

//Channel Profile
router.route("/c/:username").get(verifyJWT,getUserChannelProfile)

//Watch History
router.route("/history").get(verifyJWT,getWatchHistory)


export default router

