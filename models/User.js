import mongoose from "mongoose";
const Schema = mongoose.Schema;

const userShcema = new Schema(
  {
    phoneNumber: { type: String, require: true, unique: true },
    name: { type: String },
    email: { type: String },
    verificationCode: { type: String },
    verificationDate: { type: Date },
    refreshToken: [String],
  },
  { timestamps: true }
);

const User = mongoose.model("User", userShcema);

export default User;
