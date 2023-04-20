import jwt from "jsonwebtoken";
import AppError from "../utils/AppError.js";

const verifyJWT = (req, _res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader?.startsWith("Bearer "))
    return next(new AppError("توکن دارای فرمت صحیحی نیست", 401));

  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) return next(new AppError("توکن منقضی شده یا معتبر نیست", 401));
    req.user = decoded.phoneNumber;
    next();
  });
};

export default verifyJWT;
