// upload file on cloudinary and delete from local server
import { v2 as cloudinary} from "cloudinary";
import fs from "fs"

          
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env. CLOUDINARY_API_SECRET
});


const uploadOnCloudinary = async(localFilePath)=>{

    try {

        if(!localFilePath) return null

        //upload file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath,{
         resource_type:"auto"
        })

        //Remove file for local server if upload to cloudinary is successful
        console.log("File is uploaded on cloudinary with url :", response.url)
     
        return response

    } catch (error) {
       
        //Firstly remove file from server as upload operation failed 
        fs.unlinkSync(localFilePath)

        return null

    }

}


export {uploadOnCloudinary}

