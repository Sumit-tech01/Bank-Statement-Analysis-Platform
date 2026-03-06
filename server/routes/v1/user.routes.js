import { Router } from "express";
import { getMyProfile } from "../../controllers/user.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";

const router = Router();

router.get("/me", authenticate, getMyProfile);

export default router;
