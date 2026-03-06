import { Router } from "express";
import { getUsers } from "../../controllers/admin.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { authorize } from "../../middleware/authorize.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { listUsersSchema } from "../../utils/validation-schemas.js";

const router = Router();

router.get(
  "/users",
  authenticate,
  authorize("admin"),
  validate(listUsersSchema),
  getUsers
);

export default router;
