import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { UserLoginType, UserRolesEnum } from '../utils/constant.js';

const userSchema = new Schema(
  {
    username: {
      type: String,
      trim: true,
      minlength: 5,
      required: [true, 'username is unique & required'],
    },
    email: {
      type: String,
      lowercase: true,
      required: true,
      unique: true,
      trim: [true, 'Email is unique & required'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 5,
      trim: true,
    },
    role: {
      type: String,
      enum: Object.values(UserRolesEnum),
      default: UserRolesEnum.USER,
      required: [true, 'Role is required'],
    },
    avatar: {
      type: String,
      default: 'https://avatar.iran.liara.run/public',
    },
    loginType: {
      type: String,
      enum: Object.values(UserLoginType),
      default: UserLoginType.EMAIL_PASSWORD,
    },
    isEmailVerify: {
      type: Boolean,
      default: false,
    },
    refreshToken: String,
    forgotPasswordToken: String,
    forgotPasswordExpiry: Date,
    emailVerificationToken: String,
    emailVerificationExpiry: Date,
  },
  { timestamps: true }
);

// Pre-save middleware to hash the password before saving it to the database
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Method to compare the provided password with the stored hashed password
userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// Method to generate a refresh token on long time for the user
userSchema.methods.generateAccessAndRefreshTokens = function () {
  const SECRET_TOKEN = process.env.SECRET_TOKEN;
  const accessToken = jwt.sign(
    { _id: this._id, role: this.role },
    SECRET_TOKEN,
    { expiresIn: '1d' }
  );
  const refreshToken = jwt.sign(
    { _id: this._id, role: this.role },
    SECRET_TOKEN,
    { expiresIn: '7d' }
  );
  return { accessToken, refreshToken };
};

//  Method responsible for generating tokens for email verification, password reset etc.
userSchema.methods.generateTemporaryToken = async () => {
  const unHashedToken = crypto.randomBytes(20).toString('hex');
  const hashedToken = crypto
    .createHash('sha256')
    .update(unHashedToken)
    .digest('hex');
  const tokenExpiry = Date.now() + 20 * 60 * 1000; // 20 minutes

  return { hashedToken, tokenExpiry, unHashedToken };
};

export const User = mongoose.model('User', userSchema);
