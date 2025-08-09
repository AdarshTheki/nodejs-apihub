import jwt from 'jsonwebtoken';
import { User } from '../models/user.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const verifyJWT = (roles = [], status = []) => {
  return async (req, res, next) => {
    try {
      const token =
        req.cookies?.accessToken || req.headers.authorization?.split(' ')[1];

      if (!token) {
        throw new ApiError(401, 'No token provided');
      }

      let decodedToken;
      try {
        decodedToken = jwt.verify(token, process.env.SECRET_TOKEN);
      } catch (err) {
        return res.status(401).json(new ApiResponse(401, null, err?.message));
      }

      const user = await User.findById(decodedToken._id).select(
        '-password -refreshToken'
      );

      if (!user) {
        return res
          .status(401)
          .json(
            new ApiResponse(401, null, 'Invalid Access Token: User not found')
          );
      }

      if (roles && roles.length && !roles.includes(user.role)) {
        return res
          .status(403)
          .json(new ApiResponse(403, null, 'Permission not allowed this user'));
      }

      if (status && status.length && !status.includes(user.status)) {
        return res
          .status(403)
          .json(new ApiResponse(403, null, 'Your account is not active'));
      }

      req.user = user;
      next();
    } catch (err) {
      return res.status(500).json(new ApiResponse(500, null, err.message));
    }
  };
};
