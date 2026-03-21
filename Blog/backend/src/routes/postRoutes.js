import { Router } from 'express';
import {
  createPostController,
  deletePostController,
  getPostController,
  listPostController,
  updatePostController,
} from '../controllers/postController.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/', asyncHandler(listPostController));
router.get('/:id', asyncHandler(getPostController));
router.post('/', asyncHandler(createPostController));
router.put('/:id', asyncHandler(updatePostController));
router.patch('/:id', asyncHandler(updatePostController));
router.delete('/:id', asyncHandler(deletePostController));

export default router;
