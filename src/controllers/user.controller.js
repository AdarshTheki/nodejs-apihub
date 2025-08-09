import { isValidObjectId } from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler.js';
import { User } from '../models/user.model.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

// get all user by admin
const getAllUsers = asyncHandler(async (req, res) => {
  const page = +req.query?.page || 1;
  const limit = +req.query?.limit || 20;

  const users = await User.aggregate([
    { $match: { role: { $ne: 'admin' } } },
    {
      $project: {
        email: 1,
        username: 1,
        role: 1,
        status: 1,
        phoneNumber: 1,
        favorite: 1,
      },
    },
    { $skip: (page - 1) * limit },
    { $limit: limit },
  ]);

  if (!users || users.length === 0)
    return res
      .status(200)
      .json(new ApiResponse(200, [], 'users is empty on db'));

  res.status(200).json(new ApiResponse(200, users, 'get all users'));
});

// get single user by admin
const getSingleUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) throw new ApiError(404, 'Invalid user Id');

  const user = await User.findById(id).select('-password -refreshToken');

  if (!user) throw new ApiError(404, 'User not found!');

  res.status(200).json(new ApiResponse(200, user, 'get single user'));
});

// update user by admin
const updateSingleUserById = asyncHandler(async (req, res) => {
  const { phoneNumber, email, status, role, username } = req.body;
  const { id } = req.params;

  const user = await User.findById(id);

  if (!user) throw new ApiError(404, 'user not found!');

  user.phoneNumber = phoneNumber || user.phoneNumber;
  user.email = email || user.email;
  user.status = status || user.status;
  user.role = role || user.role;
  user.username = username || user.username;

  await user.save();

  res.status(202).json(new ApiResponse(202, user, 'update user'));
});

const deleteSingleUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findByIdAndDelete(id);

  if (!user) throw new ApiError(404, 'user not found!');

  res.status(203).json(new ApiResponse(203, user, 'user deleted successfully'));
});

const createNewUser = asyncHandler(async (req, res) => {
  const { phoneNumber, status, role, email, password, username } = req.body;

  [email, password, role, username].some((field) => {
    if (!field || field.trim() === '') {
      throw new ApiError(404, 'All fields are required of ' + field);
    }
  });

  const exitsUser = await User.findOne({ email });
  if (exitsUser) {
    throw new ApiError(404, 'user Email or Full Name already exists');
  }

  const user = await User.create({
    email,
    password,
    role,
    username,
    phoneNumber,
    status,
  });

  const createdUser = await User.findById(user?._id).select(
    '-password -refreshToken -__v'
  );

  if (!createdUser) {
    throw new ApiError(404, 'creating new user failed');
  }

  res
    .status(201)
    .json(new ApiResponse(201, createdUser, 'create a new user successfully'));
});

const toggleFavoriteProduct = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { productId } = req.params;

  const user = await User.findById(userId);

  if (!user) throw new ApiError('this user not found');

  const isFavorite = user.favorite.includes(productId);

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    {
      [isFavorite ? '$pull' : '$addToSet']: { favorite: productId },
    },
    { new: true }
  );

  res
    .status(200)
    .json(
      new ApiResponse(
        202,
        { result: updatedUser.favorite },
        isFavorite ? 'Removed from favorites' : 'Added to favorites'
      )
    );
});

export {
  getAllUsers,
  getSingleUserById,
  updateSingleUserById,
  deleteSingleUserById,
  createNewUser,
  toggleFavoriteProduct,
};
