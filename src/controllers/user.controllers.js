import {asyncHandler} from "../utlis/asyncHandler.js"
import { ApiError } from "../utlis/ApiError.js";
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utlis/cloudinary.js"
import {ApiResponse} from "../utlis/ApiResponse.js"


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
    if(!username || !email){
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
            $set :{
                refreshToken: undefined
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

export {
    registerUser, 
    loginUser,
    logoutUser
}