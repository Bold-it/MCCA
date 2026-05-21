import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/alerts
 * Fetches user alerts, filterable by severity
 */
router.get('/', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user?.userId;
    const { severity } = req.query;

    const alerts = await prisma.alert.findMany({
      where: { 
        userId,
        ...(severity && { severity: severity as string })
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, alerts });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/alerts/:id/read
 */
router.put('/:id/read', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    await prisma.alert.update({
      where: { id, userId: req.user?.userId },
      data: { read: true }
    });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/alerts/read-all
 */
router.put('/read-all', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await prisma.alert.updateMany({
      where: { userId: req.user?.userId, read: false },
      data: { read: true }
    });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
