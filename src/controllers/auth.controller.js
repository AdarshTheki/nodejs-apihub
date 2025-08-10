import { User } from '../models/user.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import {
  emailVerificationMailgenContent,
  forgotPasswordMailgenContent,
  sendEmail,
} from '../utils/mail.js';

// cookie payload
const cookiePayload = {
  path: '/',
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
};

const registerUser = asyncHandler(async (req, res) => {
  const { email, role, password, username } = req.body;

  const checkUser = await User.findOne({ $or: [{ email }, { username }] });
  if (checkUser)
    throw new ApiError(400, 'User with email or username already exists');

  const user = await User.create({
    email,
    role: role || 'USER',
    password,
    username,
    isEmailVerify: false,
  });

  // verify token to send email
  const { unHashedToken, hashedToken, tokenExpiry } =
    await user.generateTemporaryToken();

  user.emailVerificationExpiry = tokenExpiry;
  user.emailVerificationToken = hashedToken;
  await user.save({ validateBeforeSave: false });

  await sendEmail({
    to: user.email,
    subject: 'Please verify your email',
    mailgenContent: emailVerificationMailgenContent(
      user.username,
      `${process.env.SERVER_REDIRECT_URL}/api/v1/views/verify-email/${unHashedToken}`
    ),
  });

  const createdUser = await User.findById(user._id).select(
    '-password -refreshToken -emailVerificationToken -emailVerificationExpiry'
  );

  if (!createdUser) {
    throw new ApiError(500, 'Something went wrong while registering the user');
  }

  res
    .status(201)
    .json(new ApiResponse(201, createdUser, 'register user successfully'));
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    throw new ApiError(404, 'Please enter a valid email or password');

  const tempUser = await User.findOne({ email }).select('-refreshToken -__v');

  if (!tempUser) {
    throw new ApiError(404, 'user not found');
  }

  const isPasswordValid = await tempUser.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(403, 'Invalid password');
  }

  const { refreshToken, accessToken } =
    tempUser.generateAccessAndRefreshTokens();

  tempUser.refreshToken = refreshToken;

  tempUser.save();

  const modifyUser = await User.findById(tempUser._id).select(
    '-password -refreshToken -__v'
  );

  res.cookie('refreshToken', refreshToken, cookiePayload);
  res.cookie('accessToken', accessToken, cookiePayload);
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        user: modifyUser,
        accessToken,
        refreshToken,
      },
      'login user successfully with cookies'
    )
  );
});

const logoutCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { $unset: { refreshToken: 1 } },
    { new: true }
  );

  if (!user) throw new ApiError('current user not found');

  return res
    .status(200)
    .clearCookie('refreshToken')
    .clearCookie('accessToken')
    .json(new ApiResponse(200, null, 'logout current user successfully'));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, 'Current user fetched successfully'));
});

const createRefreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;

  if (!token) throw new ApiError(401, 'unauthorized: Missing refresh token');

  const decodedToken = jwt.verify(token, process.env.SECRET_TOKEN);

  const user = await User.findById(decodedToken?._id).select(
    '-password -refreshToken'
  );

  if (!user) throw new ApiError(404, 'user not found');

  const { accessToken, refreshToken } = user.generateAccessAndRefreshTokens();

  user.refreshToken = refreshToken;

  user.save();

  res
    .status(200)
    .cookie('accessToken', accessToken, cookiePayload)
    .cookie('refreshToken', refreshToken, cookiePayload)
    .json(
      new ApiResponse(
        201,
        { user, accessToken, refreshToken },
        'create refresh token with used cookies'
      )
    );
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user?._id);

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) throw new ApiError(400, 'Invalid old password');

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, 'Password changed successfully'));
});

const forgotPasswordRequest = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(404, 'User does not exists', []);
  }
  const { unHashedToken, hashedToken, tokenExpiry } =
    await user.generateTemporaryToken();

  user.forgotPasswordToken = hashedToken;
  user.forgotPasswordExpiry = tokenExpiry;
  await user.save({ validateBeforeSave: false });

  // Send mail with the password reset link.
  await sendEmail({
    mailgenContent: forgotPasswordMailgenContent(
      user.username,
      `${process.env.SERVER_REDIRECT_URL}/api/v1/views/reset-password/${unHashedToken}`
    ),
    subject: 'Password reset request',
    to: user.email,
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        'Password reset mail has been sent on your mail id'
      )
    );
});

const resetForgottenPassword = asyncHandler(async (req, res) => {
  const { resetToken } = req.params;
  const { newPassword } = req.body;

  const hashToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  const user = await User.findOne({
    forgotPasswordToken: hashToken,
    forgotPasswordExpiry: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(489, 'Token is invalid or expired');
  }

  user.forgotPasswordToken = undefined;
  user.forgotPasswordExpiry = undefined;

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, 'Password reset successfully'));
});

const assignRole = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, 'User does not exist');
  }
  user.role = role;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, 'Role changed for the user'));
});

const handleSocialLogin = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user?._id);

  if (!user) throw new ApiError(404, 'User does not exist');

  const { accessToken, refreshToken } = user.generateAccessAndRefreshTokens();

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return res
    .status(301)
    .cookie('accessToken', accessToken, cookiePayload)
    .cookie('refreshToken', refreshToken, cookiePayload)
    .redirect(
      `${process.env.CLIENT_REDIRECT_URL}/login?accessToken=${accessToken}&refreshToken=${refreshToken}`
    );
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { verificationToken } = req.params;

  if (!verificationToken)
    throw new ApiError(400, 'Email verification token is missing');

  const hashedToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');

  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpiry: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(489, 'Token is invalid or expired');
  }

  user.emailVerificationToken = undefined;
  user.emailVerificationExpiry = undefined;
  // Turn the email verified flag to `true`
  user.isEmailVerify = true;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, { isEmailVerified: true }, 'Email is verified'));
});

const resendEmailVerification = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user?._id);
  if (!user) throw new ApiError(404, 'User does not exists');

  if (user.isEmailVerify) throw new ApiError(400, 'Email is already verified!');

  // send to email verification o the email address
  const { unHashedToken, hashedToken, tokenExpiry } =
    await user.generateTemporaryToken();

  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpiry = tokenExpiry;
  await user.save({ validateBeforeSave: false });

  await sendEmail({
    to: user.email,
    subject: 'Please verify your email',
    mailgenContent: emailVerificationMailgenContent(
      user.username,
      `${process.env.SERVER_REDIRECT_URL}/api/v1/views/verify-email/${unHashedToken}`
    ),
  });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, 'Mail has been sent to your mail ID'));
});

export {
  registerUser,
  loginUser,
  getCurrentUser,
  logoutCurrentUser,
  createRefreshToken,
  changeCurrentPassword,
  forgotPasswordRequest,
  resetForgottenPassword,
  assignRole,
  handleSocialLogin,
  verifyEmail,
  resendEmailVerification,
};
