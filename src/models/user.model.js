import mongoose from "mongoose";

// To encrypt Pasword
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt"



const userSchema = new mongoose.Schema({

  username :{
    type: String,
    required:true,
    unique: true,
    lowercase: true,
    trime: true,
    index : true // to optimise searching
  },

  email :{
    type: String,
    required:true,
    unique: true,
    lowercase: true,
    trime : true
  },

  fullName :{
    type: String,
    required:true,
    trime: true,
    index : true
  },



  avatar : {
    type : String, // cloudinary url
    required: true
  },

  coverImage : {
    type : String, // cloudinary url
  },


  watchHistory : [
    {
        type: mongoose.Schema.Types.ObjectId,
        ref:"Video"
    }
  ],

  password :{
    type: String,
    required:[true, "Password is required"],
  },

  refreshToken : {
    type: String
  }

},{timestamps:true})


userSchema.pre("save",async function (next){

    //Don't encrypt execpt modification of password
    if(!this.isModified("password"))
    return next()

    this.password = bcrypt.hash(this.password,10)
    next()
})

// Custom method to check if the encrypted pass is the correct
// or the encrypted pass is same as pass given by user
userSchema.methods.isPasswordCorrect = async function(password){

    return await bcrypt.compare(password,this.password)  

}

// Custom method to generate Access Tokens
userSchema.methods.generateAccessTokens = function(){

  return jwt.sign(
    //data
    {
      _id : this._id,
      email: this.email,
      username : this.username,
      fullName : this.fullName

    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY
    }
  )

}


// Custom method to generate Refresh Tokens
userSchema.methods.generateRefreshTokens = function(){

  return jwt.sign(
    //data
    {
      _id : this._id
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY
    }
  )

}


export const User = mongoose.model('User', userSchema)

