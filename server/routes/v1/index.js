import { Router } from "express";
import authRoutes from "../authRoutes.js";
import statementRoutes from "../statementRoutes.js";
import analysisRoutes from "../analysisRoutes.js";
import userRoutes from "./user.routes.js";
import adminRoutes from "./admin.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/statements", statementRoutes);
router.use("/analysis", analysisRoutes);
router.use("/users", userRoutes);
router.use("/admin", adminRoutes);

export default router;
