import { Router } from 'express';
import {
  getInquiries,
  getInquiryById,
  createInquiry,
  updateInquiryStatus,
} from '../controllers/inquiry.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getInquiries);
router.post('/', createInquiry);
router.get('/:id', getInquiryById);
router.patch('/:id/status', updateInquiryStatus);

export default router;
