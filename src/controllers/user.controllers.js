import {asyncHandler} from "../utlis/asyncHandler.js"
import { ApiError } from "../utlis/ApiError.js";
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utlis/cloudinary.js"
import {ApiResponse} from "../utlis/ApiResponse.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose";


// Generate Access and Refresh Tokens
const generateAccessAndRefreshTokens = async(userId)=>{

    try {
       
       const user = await User.findById(userId) 
       const accessToken = user.generateAccessTokens()
       const refreshToken = user.generateRefreshTokens()

       //add refesh token in database object
       user.refreshToken = refreshToken
       // save to db
       await user.save({validateBeforeSave:false})


       //send the tokens
       return {accessToken,refreshToken}
        
    } catch (error) {
        
        throw new ApiError(500, "Something went wrong while generating access and refresh token ")
    }

}




const registerUser = asyncHandler( async(req, res)=>{
    
    // Steps to register the User

    // 1. Get the user details from frontend
    // 2. validation 
    // 3. check if user already exist : username and email check
    // 4. check for images -> check for avatar
    // 5. upload them to cloudinary , avatar check
    // 6. create user object -> create entry in db
    // 7. remove pass and refresh token field from response
    // 8. check for user creation -> should not be null
    // 9. return res


    //1
    const {fullName, email,username, password } = req.body
    console.log("email", email);

    //2

    // if(fullName === ""){
    //   throw new ApiError(400, "Full Name is required")
    // }

    if([fullName,email,username,password].some((field)=> field?.trim()==="")){

        throw new ApiError(400,"ALl fields are required")
    }


    //3 
    // User model can directly contact mongoDB 
    // We will check if there exist a user with same email or same username
    const existedUser = await User.findOne({

        $or:[{username},{email}]

    })

    if(existedUser){
        throw new ApiError(409, "User with same email or username already exists")
    }

    // console.log("Files in req.files user controller : ", req.files)

    //4
    const avatarLocalPath = req.files?.avatar[0]?.path
    // const coverImageLocalPath = req.files?.coverImage[0]?.path 

    let coverImageLocalPath
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is required")
    }

    //5
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar.url){
        throw new ApiError(400,"Avatar file is required")
    }


    //6
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    //7
    // We return the created user except password and refresh token
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    //8
    if(!createdUser){
        throw new ApiError(500,"Something went wrong while registering the user")
    }

    //9
    return res.status(201).json(
        new ApiResponse(200,createdUser, "User Registered Successfully")
    )










    
})


const loginUser = asyncHandler(async(req,res)=>{

    // Steps to Login User

    // 1.  get details from the frontend
    // 2.  check username or email 
    // 3.  find the user in database on the basis of email or username
    // 4.  password check 
    // 5. generate access and refresh token 
    // 6. send tokens in cookies 
    // 7. send response



    //1.
    const {email, password, username} = req.body

    //2.
    if(!username && !email){
        throw new ApiError(400, "username or email is required ")
    }

    //3.
    const user = await User.findOne({
        $or:[{username},{email}]
    })

    if(!user){
        throw new ApiError(404,"User does not exist")
    }

    //4.
    // operations on user like check password will work only on the user got from mongodb DB and not 
    // user model 
    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401,"Incorrect password")
    }

    //5. 
    const {accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)


    
    // Make a database query to get the updated user ( with refresh token) after the function call
    const loggedInUser = await User.findById(user._id)
    .select("-password -refreshToken")


    //6 and 7
    //Secure options for cookies
    const options = {
        httpOnly: true,
        secure: true
    }

    
    return  res
            .status(200)
            .cookie("accessToken",accessToken, options)
            .cookie("refreshToken",refreshToken, options)
            .json(
                new ApiResponse(200,{
                    user: loggedInUser,accessToken, refreshToken
                },
                "User LoggedIn Successfully"
            ) )

})


const logoutUser = asyncHandler( async(req,res)=>{

    //Steps to logout an user

    // 1. Get the user id and Fetch the user from DB with the help of id 
    // 2. Remove the refresh tokens
    // 3. Remove cookies and return response

    
    // Because of middleware , logoutUser now have the access of req.uer
    
    //1 and 2
    await User.findByIdAndUpdate(

        // find from what
        req.user._id,

        //update what
        {
            // $set :{
            //     refreshToken: undefined
            // }

            $unset :{
                refreshToken:1 // to remove a field from document 
            }
        },

        //send the new data
        {
            new : true
        }
    )

    // 3
    const options = {
        httpOnly: true,
        secure: true
    }


    return res
           .status(200)
           .clearCookie("accessToken", options)
           .clearCookie("refreshToken", options)
           .json(
            new ApiResponse(200,{},"User Logged Out Sucessfully")
           )
    
})


const refreshAccessToken = asyncHandler( async(req,res)=>{

   // Steps 
   
   //1. Get refresh Tokens from cookies or body
   //2. Throw error if no token
   //3. Verify the token
   //4. Get the data from DB using decoded information
   //5. Match the token from browser to the token from DB
   //6. Generate new access and refresh tokens using id and send response



   //1
   const incomingRefreshToken = req.cookies.refreshToken || // for web
                        req.body.refreshToken       // for mobile


   //2                     
   if(!incomingRefreshToken){
    throw new ApiError(401, "Unauhtorized Request")
   }
   
    
   try {
    //3
    const decodedToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
    
    //4
    const user = await User.findById(decodedToken?._id)
 
    if(!user){
     throw new ApiError(401,"Invalid refresh token")
    }
 
    //5
    if(incomingRefreshToken !== user?.refreshToken){
     throw new ApiError(401,"Refresh Token is expired or used")
    }
 
    //6
 
    const options = {
     httpOnly: true,
     secure:true
    }
 
 
    const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
 
 
    return res
           .status(200)
           .cookie("accessToken", accessToken, options)
           .cookie("refreshToken", newRefreshToken, options)
           .json(
             new ApiResponse(
                 200,
                 {accessToken,refreshToken:newRefreshToken},
                 "Access Token Refreshed Successfully"
             )
           )
   } catch (error) {
    

    throw new ApiError(401, error?.message || "Invalid Refresh Token !!")

   }

    
})


// UPDATING USER 

const changeCurrentPassword = asyncHandler( async(req,res)=>{

    // Steps to Change Password

    //1. Get the old and new password from the user
    //2. As we are using auth middleware, get id from the user object , to get user from DB
    //3. Check if old password is same as the one initially formed 
    //4. If not correct throw error
    //5. Set the new password, pre middlware in models will automatically hash the password before saving
    //6. Save the update
    //7. Send Response

    //1.
    const {oldPassword, newPassword} = req.body
    
    //2.
    const user = await User.findById(req.user?._id)

    //3.
    const isPasswordCorrect = user.isPasswordCorrect(oldPassword)

    //4.
    if(!isPasswordCorrect){
        throw new ApiError(400,"Invalid old password")
    }

    //5.
    user.password = newPassword


    //6
    await user.save({validateBeforeSave:false})


    //7.
    return res
           .status(200)
           .json(
            new ApiResponse(200,{},"Password Updated Successfully")
           )


})

const getCurrentUser = asyncHandler( async(req, res)=>{

    // As we have auth middleware: verifyJwt, which has access to user object

    return res
           .status(200)
           .json(
            new ApiResponse(200, req.user, "Current User fetched Successfully")
           )
})

const updateAccountDetails = asyncHandler( async(req,res)=>{

    // Steps

    //1. Get the details from the body
    //2. Apply validations
    //3. Find and update user details ( using auth middleware)
    //4. Send response
    
    //1. 
    const {fullName, email} = req.body

    //2.
    if(!fullName && !email) {
        throw new ApiError(400, "All fields are required")
    }

    //3.
    const user = await User.findByIdAndUpdate(
        //find
        req.user?._id,

        //update
        {

            $set :{
                fullName,     // fullName : fullName
                email        // email: email 
            }

        },

        //return info after update
        {
            new: true
        }

    ).select("-password -refreshToken")   // could be done in another DB call with "user"


    return res
           .status(200)
           .json(
            new ApiResponse(200, user, "Account Details Updated Successfully")
           )

})

const updateUserAvatar = asyncHandler( async(req,res)=>{

    // To update avatar, two middlewares will going to be needed
    // 1: "multer" to upload the new avatar
    // 2: "auth" to check and allow only loggedin users to update 

    
    //Steps
    //1. Get the file from req ( using multer )
    //2. Apply validations 
    //3. Upload on cloudinary
    //4. Apply validation on cloudinary url
    //5. Update the new avatar url in DB
    //6. Send response

    //TODO : Remove the old avatar image from cloudinary 

    //1.
    const avatarLocalPath = req.file?.path
    
    //2.
    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar File is missing")
    }

    //3.
    const avatar = await uploadOnCloudinary(avatarLocalPath)

    //4.
    if(!avatar.url){
        throw new ApiError(400,"Error while uploading avatar on cloudinary" )
    }

    //5.
    const user = await User.findByIdAndUpdate(
        req.user?._id,

        {
            $set :{
                avatar: avatar.url
            }
        },
        {
            new : true
        }
    )
    .select("-password -refreshToken")


    //6.
    return res
           .status(200)
           .json(
            new ApiResponse(200, user , "Avatar Updated Successfully")
           )




})

const updateUserCoverImage = asyncHandler( async(req,res)=>{

    // To update coverImage, two middlewares will going to be needed
    // 1: "multer" to upload the new avatar
    // 2: "auth" to check and allow only loggedin users to update 

    
    //Steps
    //1. Get the file from req ( using multer )
    //2. Apply validations 
    //3. Upload on cloudinary
    //4. Apply validation on cloudinary url
    //5. Update the new coverImage url in DB
    //6. Send response

    //TODO : Remove the old cover image from cloudinary 


    //1.
    const coverImageLocalPath = req.file?.path
    
    //2.
    if(!coverImageLocalPath){
        throw new ApiError(400, "Avatar File is missing")
    }

    //3.
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    //4.
    if(!coverImage.url){
        throw new ApiError(400,"Error while uploading CoverImage on cloudinary" )
    }

    //5.
    const user = await User.findByIdAndUpdate(
        req.user?._id,

        {
            $set :{
                coverImage: coverImage.url
            }
        },
        {
            new : true
        }
    )
    .select("-password -refreshToken")


    //6.
    return res
           .status(200)
           .json(
            new ApiResponse(200, user , "CoverImage Updated Successfully")
           )




})

// Details

const getUserChannelProfile = asyncHandler( async(req, res)=>{

     // Steps : 

     //1. Get the username from params of the visited channel
     //2. Apply validation for username
     //3. Apply aggregate pipeline to get the required fields of user 
     //4. Apply validations on the result from pipelines
     //5. Send the response


     //1.
     const {username} = req.params

     //2.
     if(!username){
        throw new ApiError(400,"Username is Missing" )
     }

     //3.
     const channel = await User.aggregate([
        //filter the username
        {
            $match : {
                username : username?.toLowerCase()
            }
        },

        //get the subscribers of a channel from subscription model using lookup
        {

            $lookup :{ 
                from : "subscriptions", // name of Subscription model in DB = subscriptions
                localField: "_id",
                foreignField: "channel",  // finding the channel documents with user id
                as : "subscribers"
            }

        },

        //get the channels user has subscriber To
        {
            $lookup:{
                from : "subscriptions",
                localField : "_id",
                foreignField :"subscriber",
                as : "subscribedTo"
            }
        },
        
        //add sybscribers and subscribedTo field in the user document
        {
            $addFields :{
                
                //name of field to add
                subscribersCount : {
                    $size : "$subscribers"
                },

                channelsSubscribedToCount :{ 
                    $size: "$subscribedTo"
                },

                //for indication if the user has subscribed to the current channel , they are visiting
                isSubscribed: {
                   
                    $cond : {

                        //check if user on the channel is present in the subscribers list or not 
                        if:{ $in :[req.user?._id, "$subscribers.subscriber"]},
                        then : true,
                        else: false
                    }

                }
            }
        },

        // Pass the values
        {
          
            $project:{
                fullName : 1,
                username : 1,
                subscribersCount : 1,
                channelsSubscribedToCount : 1,
                isSubscribed : 1,
                avatar : 1,
                coverImage : 1,
                email : 1,
            }

        }
     ])

     //4.
     if(!channel?.length){

        throw new ApiError(404, "Channel does not exist")

     }

     //5.
     return res
            .status(200)
            .json(
                new ApiResponse(200, channel[0], "User Channel fetched Successfully")
            )


})


const getWatchHistory = asyncHandler( async(req,res)=>{

    const user = await User.aggregate([
        
        //get the user
        {
            $match :{
                _id : new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        
        // link videos to user
        {
 
            $lookup :{
                from :"videos",
                localField:"watchHistory",
                foreignField:"_id",
                as : "watchHistory",

                // as owners are needed , a sub pipeline will be needed to delve into videos 
                pipeline:[
                 
                    //in videos currently

                    {
                       $lookup: {
                        from :"users",
                        localField:"owner",
                        foreignField:"_id",
                        as:"owner",

                        //TODO : try without a sub pipeline on 2nd level itself
                        pipeline:[
                            {
                             $project: {
                                fullName:1,
                                username:1,
                                avatar:1
                             }
                            }
                        ]
                       }
                    },

                    // to destructure the owner object from array of objects 
                    {
                        $addFields:{
                            //overwrite exisiting field
                            owner:{
                              $first : "$owner"  
                            }
                        }
                    }

                ]
            }
        
        }
    ])


    return res
           .status(200)
           .json(
            new ApiResponse(200, user[0].watchHistory, "Watch History Fetched Successfully")
           )

})



export {
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
}