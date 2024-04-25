// Verify for the user

import { ApiError } from "../utlis/ApiError.js";
import { asyncHandler } from "../utlis/asyncHandler.js";
import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js";


export const verifyJWT = asyncHandler( async(req,res, next)=>{

    try {
        const token = req.cookies.accessToken //for web
        || req.header("Authorization")?.replace("Bearer ","") // from mobile browser ( as Authorization : Bearer <Token>)
    
    
        if(!token){
            throw new ApiError(401,"Unauthorized request")
        }
    
    
        // IF TOKEN IS PRESENT, MATCH IT WITH THE HELP OF JWT 
        
        // Decode data from jwt, passed during generating token
        const decodedToken = jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
    
    
        const user = await User.findById(decodedToken?._id)
        .select("-password -refreshToken")
    
        if(!user){
    
            throw new ApiError(401,"Invalid Access Token")
        }
    
    
        //add an object in the request that will be used for logout 
        req.user = user
        next()

    } catch (error) {
        
        throw new ApiError(401,error?.message || "Invalid Access Token!!!")
    }

})