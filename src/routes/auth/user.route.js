import { Router } from 'express';
import { verifyJWT } from '../../middlewares/auth.middleware.js';
import { upload } from '../../middlewares/multer.middleware.js';
import {
    getAllUsers,
    getSingleUserById,
    updateSingleUserById,
    createNewUser,
    deleteSingleUserById,
    logoutCurrentUser,
    getCurrentUser,
    updateCurrentUser,
    googleAuth,
    toggleFavoriteProduct,
    createRefreshToken,
    registerUser,
    loginUser,
} from '../../controllers/auth/user.controller.js';

const router = Router();

router
    .route('/')
    .get(verifyJWT(['admin', 'seller']), getAllUsers)
    .post(verifyJWT(['admin', 'seller'], createNewUser));

router
    .route('/user/:id')
    .get(getSingleUserById)
    .patch(verifyJWT(['admin', 'seller']), updateSingleUserById)
    .delete(verifyJWT(['admin', 'seller']), deleteSingleUserById);

router
    .route('/current-user')
    .get(verifyJWT(), getCurrentUser)
    .patch(verifyJWT(), upload.single('avatar'), updateCurrentUser)
    .delete(verifyJWT(), logoutCurrentUser);

router.route('/favorite/:productId').post(verifyJWT(), toggleFavoriteProduct);

router.route('/refresh-token').post(verifyJWT(), createRefreshToken);

router.route('/sign-up').post(registerUser);

router.route('/sign-in').post(loginUser);

router.route('/google').post(googleAuth);

export default router;
