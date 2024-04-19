import multer from "multer";


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, "./pubic/temp")
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname)
      //Using the name of file that is original given by user -> as the file will stay on local server for a short duration
      //Todo: create an unique name for each file : file.fieldname + '-' + Date.now()
    }
  })

  //This return file local path
  
export const upload = multer({ 
    storage,
})