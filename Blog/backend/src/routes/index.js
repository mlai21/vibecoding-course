import { Router } from 'express';
import postRoutes from './postRoutes.js';

const router = Router();

router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      service: 'blog-backend',
      status: 'ok',
      timestamp: new Date().toISOString(),
    },
  });
});

router.use('/posts', postRoutes);

export default router;
