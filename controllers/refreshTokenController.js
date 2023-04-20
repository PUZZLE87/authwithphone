import User from "../models/User.js";
import AppError from "../utils/AppError.js";
import catchFn from "../utils/catchFunction.js";
import jwt from "jsonwebtoken";

const handleRefreshToken = catchFn(async (req, res, next) => {
  const cookies = req.cookies;
  if (!cookies?.jwt) return next(new AppError("رفرش توکن ارسال نشده", 401));

  const refreshToken = cookies.jwt;

  res.clearCookie("jwt", { httpONly: true, sameSite: "None", secure: true });

  const foundUser = await User.findOne({ refreshToken });
  if (!foundUser) {
    jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET,
      async (err, decoded) => {
        if (err) return;

        const hackedUser = await User.findOne({
          phoneNumber: decoded.phoneNumber,
        });

        hackedUser.refreshToken = [];
        await hackedUser.save();
      }
    );

    return next(
      new AppError("توکن با اطلاعات کاربر تطابق ندارد یا معتبر نیست", 403)
    );
  }
  const newRefreshTokenArray = foundUser.refreshToken.filter(
    (rt) => tr !== refreshToken
  );
  jwt.verify(
    refreshToken,
    process.env.REFRESH_TOKEN_SECRET,
    async (err, decoded) => {
      if (err) {
        foundUser.refreshToken = [...newRefreshTokenArray];
        await foundUser.save();
      }

      if (err || foundUser.phoneNumber !== decoded.phoneNumber)
        return next(
          new AppError("توکن منقضی شده یا با اطلاعات شما تطابق ندارد", 403)
        );

      const accessToken = jwt.sign(
        { phoneNumber: decoded.phoneNumber },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "60s" }
      );

      const newRefreshToken = jwt.sign(
        { phoneNumber: foundUser.phoneNumber },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: "5d" }
      );

      foundUser.refreshToken = [...newRefreshTokenArray, newRefreshToken];
      await foundUser.save();

      res.cookie("jwt", newRefreshToken, {
        httpONly: true,
        secure: true,
        sameSite: "None",
        maxAge: 5 * 24 * 60 * 60 * 1000,
      });

      res.json({ accessToken });
    }
  );
});

export default handleRefreshToken;
