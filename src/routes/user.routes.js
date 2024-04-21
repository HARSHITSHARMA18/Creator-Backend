import { Router } from "express";
import { registerUser } from "../controllers/user.controllers.js";

const router = Router()


// user register route
router.route("/register").post(registerUser)



export default router

