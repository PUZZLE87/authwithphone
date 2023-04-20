import express from "express";
import authController from "../../controllers/authController.js";
import { codeLimiter, phoneLimiter } from "../../middleware/rateLimit.js";

const router = express.Router();

router.post("/sendCode", phoneLimiter, authController.handleSmsCode);
router.post("/smsAuth", codeLimiter, authController.handleSmsAuth);

export default router;
