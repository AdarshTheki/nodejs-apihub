import jwt from 'jsonwebtoken';
import { isValidObjectId } from 'mongoose';
import {
    uploadSingleImage,
    removeSingleImage,
} from '../../utils/cloudinary.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { User } from '../../models/auth/user.model.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';

// cookie payload
const cookiePayload = {
    maxAge: 2 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
};

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);

        const refreshToken = user.generateRefreshToken();
        const accessToken = user.generateAccessToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { refreshToken, accessToken };
    } catch (error) {
        throw new ApiError(404, error?.message);
    }
};

// get all user by admin
const getAllUsers = asyncHandler(async (req, res) => {
    const page = +req.query?.page || 1;
    const limit = +req.query?.limit || 20;

    const users = await User.aggregate([
        { $match: { role: { $ne: 'admin' } } },
        {
            $project: {
                email: 1,
                fullName: 1,
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

const registerUser = asyncHandler(async (req, res) => {
    const { email, role, password, fullName } = req.body;

    const user = await User.create({
        email,
        role,
        password,
        fullName,
    });

    res.status(201).json(
        new ApiResponse(201, user, 'register user successfully')
    );
});

// update user by admin
const updateSingleUserById = asyncHandler(async (req, res) => {
    const { phoneNumber, email, status, role, fullName } = req.body;
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) throw new ApiError(404, 'user not found!');

    user.phoneNumber = phoneNumber || user.phoneNumber;
    user.email = email || user.email;
    user.status = status || user.status;
    user.role = role || user.role;
    user.fullName = fullName || user.fullName;

    await user.save();

    res.status(202).json(new ApiResponse(202, user, 'update user'));
});

const deleteSingleUserById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const user = await User.findByIdAndDelete(id);

    if (!user) throw new ApiError(404, 'user not found!');

    res.status(203).json(
        new ApiResponse(203, user, 'user deleted successfully')
    );
});

const getCurrentUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select(
        '-refreshToken -password -__v'
    );

    if (!user) throw new ApiError(404, 'current user not found');

    res.status(200).json(new ApiResponse(200, user, 'get current user'));
});

const createNewUser = asyncHandler(async (req, res) => {
    const { phoneNumber, status, role, email, password, fullName } = req.body;

    [email, password, role, fullName].some((field) => {
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
        fullName,
        phoneNumber,
        status,
    });

    const createdUser = await User.findById(user?._id).select(
        '-password -refreshToken -__v'
    );

    if (!createdUser) {
        throw new ApiError(404, 'creating new user failed');
    }

    res.status(201).json(
        new ApiResponse(201, createdUser, 'create a new user successfully')
    );
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

    const { refreshToken, accessToken } = await generateAccessAndRefreshTokens(
        tempUser._id
    );

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
        req.user._id,
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

const updateCurrentUser = asyncHandler(async (req, res) => {
    const {
        oldPassword,
        newPassword,
        phoneNumber,
        email,
        status,
        role,
        fullName,
    } = req.body;
    const filePath = req?.file?.path;

    const user = await User.findById(req.user._id);

    if (!user) throw new ApiError(404, 'current user not found');

    // check password
    if (oldPassword || newPassword) {
        if (
            ['guest-user@gmail.com', 'useradmin@gmail.com'].includes(user.email)
        )
            throw new ApiError(404, 'Access denied this user');

        const check = await user.isPasswordCorrect(oldPassword);

        if (!check) throw new ApiError(404, 'your old password is wrong');

        user.password = newPassword;
    }

    // check avatar
    if (filePath) {
        const avatar = await uploadSingleImage(filePath);
        if (user?.avatar) await removeSingleImage(user.avatar);
        if (avatar) user.avatar = avatar;
    }

    user.phoneNumber = phoneNumber || user.phoneNumber;
    user.email = email || user.email;
    user.status = status || user.status;
    user.role = role || user.role;
    user.fullName = fullName || user.fullName;

    await user.save();

    res.status(202).json(
        new ApiResponse(202, user, 'current user updated successfully')
    );
});

const createRefreshToken = asyncHandler(async (req, res) => {
    const token = req.cookies?.refreshToken;

    if (!token) throw new ApiError(401, 'unauthorized: Missing refresh token');

    const decodedToken = jwt.verify(token, process.env.SECRET_TOKEN);

    const user = await User.findById(decodedToken?._id).select(
        '-password -refreshToken'
    );

    if (!user) throw new ApiError(404, 'user not found');

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
        user._id
    );

    res.status(200)
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

// google auth callback route for Google to redirect to after authentication
const googleAuth = asyncHandler(async (req, res) => {
    const scope = ['profile', 'email']; // Request user's profile and email information
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?
    client_id=${process.env.GOOGLE_CLIENT_ID}&
    redirect_uri=${encodeURIComponent(process.env.REDIRECT_URI)}& 
    response_type=code&
    scope=${encodeURIComponent(scope.join(' '))}`;

    res.redirect(authUrl);
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

    res.status(200).json(
        new ApiResponse(
            202,
            { result: updatedUser.favorite },
            isFavorite ? 'Removed from favorites' : 'Added to favorites'
        )
    );
});

export {
    registerUser,
    loginUser,
    getAllUsers,
    getSingleUserById,
    getCurrentUser,
    updateCurrentUser,
    updateSingleUserById,
    deleteSingleUserById,
    createNewUser,
    logoutCurrentUser,
    createRefreshToken,
    googleAuth,
    toggleFavoriteProduct,
};
