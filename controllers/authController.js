import AppError from "../utils/AppError.js";
import catchFn from "../utils/catchFunction.js";
import randomInteger from "random-int";
import TrezSMSClient from "trez-sms-client";
import User from "../models/User.js";
import uniqueString from "unique-string";
import jwt from "jsonwebtoken";

const handleSmsCode = catchFn(async (req, res, next) => {
  const { phoneNumber } = req.body;
  if (!phoneNumber)
    return next(new AppError("شماره موبایل نمی‌تواند خالی بماند"), 400);
  const regex = new RegExp("^09\\d{9}$");
  const isValidNum = regex.test(phoneNumber);
  if (!isValidNum)
    return next(new AppError("شماره موبایل وارد شده معتبر نیست", 400));

  const verificationCode = randomInteger(100123, 999879);

  const client = new TrezSMSClient(
    process.env.SMS_USERNAME,
    process.env.SMS_PASSWORD
  );

  client
    .manualSendCode(
      phoneNumber,
      `وب سایت پازل \n کد تایید شما: ${verificationCode} \n مدت اعتبار این کد ۲ دقیقه می‌باشد`
    )
    .then(async (messageId) => {
      if (messageId <= 2000)
        return next(
          AppError(
            "ارسال کد تایید با خطا مواجه شد لطفا دوباره تلاش نمایید",
            500
          )
        );
      let user = await User.findOne({ phoneNumber });
      if (!user) {
        user = await User.create({ phoneNumber });
        user.name = uniqueString().slice(3, 10);
      }
      user.verificationCode = verificationCode;
      user.verificationDate = new Date();
      await user.save();

      return res.status(200).json({
        message: "کد تایید به شماره موبایل وارد شده ارسال گردید",
        phoneNumber,
      });
    })
    .catch((err) => {
      return next(
        new AppError("کد تایید ارسال نشد لطفا دوباره تلاش نمایید", 500)
      );
    });
});

const handleSmsAuth = catchFn(async (req, res, next) => {
  const { phoneNumber, verificationCode } = req.body;
  if (!phoneNumber || !verificationCode)
    return next(new AppError("شماره موبایل یا کد تایید الزامی است", 400));

  const regex = new RegExp("^09\\d{9}$");
  const isValidNum = regex.test(phoneNumber);
  if (!isValidNum)
    return next(new AppError("شماره موبایل وارد شده معتبر نیست", 400));
  if (Number(verificationCode) <= 100123)
    return next(new AppError("کد تایید وارد شده اشتباه است", 400));

  const user = await User.findOne({ phoneNumber });

  if (!user) return next(new AppError("کاربری یافت نشد", 400));

  if (user.verificationCode !== verificationCode)
    return next(new AppError("کد تایید اشتباه می‌باشد", 400));

  if (!user.verificationDate)
    return next(new AppError("کد ارسالی معتبر نیست", 400));

  const verificationDate = new Date(
    user.verificationDate.getTime() + 120 * 1000
  );

  if (verificationDate < new Date()) {
    user.verificationCode = "";
    user.verificationDate = null;
    await user.save();
    return next(new AppError("کد تایید منقضی شده است", 401));
  }

  const cookies = req.cookies;
  const newRefreshTokenArray = !cookies.jwt
    ? user.refreshToken
    : user.refreshToken.filter((rt) => rt !== cookies.jwt);

  if (cookies.jwt)
    res.clearCookie("jwt", { httpONly: true, sameSite: "None", secure: true });

  const accessToken = jwt.sign(
    { phoneNumber },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "60s" }
  );

  const refreshToken = jwt.sign(
    { phoneNumber },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: "5d" }
  );

  user.refreshToken = [...newRefreshTokenArray, refreshToken];
  user.verificationCode = "";
  user.verificationDate = null;
  await user.save();

  res.cookie("jwt", refreshToken, {
    httpONly: true,
    secure: true,
    sameSite: "None",
    maxAge: 1000 * 60 * 60 * 24 * 5,
  });

  res.json({
    accessToken,
    userInfo: { name: user.name, email: user.email },
  });
});

export default { handleSmsCode, handleSmsAuth };
