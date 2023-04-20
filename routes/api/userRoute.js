import express from "express";
import verifyJWT from "../../middleware/verifyJWT.js";

const router = express.Router();

// public routes

// protected routes

router.use(verifyJWT);
router.get("/", (req, res) => {
  res.json({ user: "userdata" });
});

export default router;
