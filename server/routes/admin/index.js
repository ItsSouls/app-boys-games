import express from 'express';
import { auth } from '../../middleware/auth.js';
import { requireAdmin } from '../../middleware/requireAdmin.js';
import { createPromoteRoute } from './promote.js';
import { videosRouter } from './videos.js';
import { pagesRouter } from './pages.js';

const router = express.Router();

createPromoteRoute(router);

router.use(auth, requireAdmin);
router.use('/videos', videosRouter);
router.use('/pages', pagesRouter);

export default router;
