// Using utlity function for using connection to DB throught the project

// Higher order function
const asyncHandler = (requestHandler)=>{

    (req, res, next)=>{

        Promise
        .resolve(requestHandler(req, res,next))
        .catch((err)=>next(err))
    }

}

export {asyncHandler}


