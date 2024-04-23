import {asyncHandler} from "../utlis/asyncHandler.js"
import { ApiError } from "../utlis/ApiError.js";
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utlis/cloudinary.js"
import {ApiResponse} from "../utlis/ApiResponse.js"

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

    if(!avatar){
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

export {registerUser}