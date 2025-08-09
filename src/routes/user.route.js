import { Router } from 'express';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import {
  getAllUsers,
  getSingleUserById,
  updateSingleUserById,
  deleteSingleUserById,
  createNewUser,
  toggleFavoriteProduct,
} from '../controllers/user.controller.js';

const router = Router();

router
  .route('/')
  .get(verifyJWT(['admin', 'seller']), getAllUsers)
  .post(verifyJWT(['admin', 'seller'], createNewUser));

router
  .route('/:id')
  .get(getSingleUserById)
  .patch(verifyJWT(['admin', 'seller']), updateSingleUserById)
  .delete(verifyJWT(['admin', 'seller']), deleteSingleUserById);

router.route('/favorite/:productId').post(verifyJWT(), toggleFavoriteProduct);

export default router;
