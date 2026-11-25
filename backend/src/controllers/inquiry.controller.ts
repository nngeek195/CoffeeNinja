import { Response } from 'express';
import { z } from 'zod';
import { InquiryStatus, Prisma, Role } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';
import {
  createInquirySchema,
  updateStatusSchema,
  uuidSchema,
} from '../validators/inquiry.validator';

const OWNER_INCLUDE = { createdBy: { select: { id: true, name: true, email: true } } };

const STALE_DATA_RESPONSE = {
  error: 'This inquiry was updated elsewhere. Please refresh to see the latest status.',
  code: 'STALE_DATA',
};

const ALLOWED_TRANSITIONS: Record<InquiryStatus, InquiryStatus[]> = {
  NEW: [InquiryStatus.IN_PROGRESS],
  IN_PROGRESS: [InquiryStatus.RESOLVED],
  RESOLVED: [],
};

export const getInquiries = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { status, search } = req.query;

    const where: Prisma.InquiryWhereInput = {};

    if (user.role !== Role.ADMIN) {
      where.createdById = user.userId;
    }

    if (status && Object.values(InquiryStatus).includes(status as InquiryStatus)) {
      where.status = status as InquiryStatus;
    }

    if (search && typeof search === 'string' && search.trim().length > 0) {
      const term = search.trim();
      where.OR = [
        { customerName: { contains: term, mode: 'insensitive' } },
        { customerContact: { contains: term, mode: 'insensitive' } },
        { subject: { contains: term, mode: 'insensitive' } },
      ];
    }

    const inquiries = await prisma.inquiry.findMany({
      where,
      include: OWNER_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });

    res.json({ inquiries });
  } catch (error) {
    console.error('Get inquiries error:', error);
    res.status(500).json({ error: 'Failed to load inquiries' });
  }
};

export const getInquiryById = async (req: AuthRequest, res: Response) => {
  const idCheck = uuidSchema.safeParse(req.params.id);
  if (!idCheck.success) {
    res.status(400).json({ error: 'Invalid inquiry ID format' });
    return;
  }

  try {
    const inquiry = await prisma.inquiry.findUnique({
      where: { id: idCheck.data },
      include: OWNER_INCLUDE,
    });

    if (!inquiry) {
      res.status(404).json({ error: 'Inquiry not found' });
      return;
    }

    if (req.user!.role !== Role.ADMIN && inquiry.createdById !== req.user!.userId) {
      res.status(403).json({ error: 'You do not have permission to view this inquiry' });
      return;
    }

    res.json({ inquiry });
  } catch (error) {
    console.error('Get inquiry by ID error:', error);
    res.status(500).json({ error: 'Failed to fetch inquiry' });
  }
};

export const createInquiry = async (req: AuthRequest, res: Response) => {
  const parsed = createInquirySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Please correct the highlighted fields',
      details: z.flattenError(parsed.error).fieldErrors,
    });
    return;
  }

  const { customerName, customerContact, subject, description } = parsed.data;

  try {
    const duplicate = await prisma.inquiry.findFirst({
      where: {
        customerContact: { equals: customerContact, mode: 'insensitive' },
        subject: { equals: subject, mode: 'insensitive' },
        status: { in: [InquiryStatus.NEW, InquiryStatus.IN_PROGRESS] },
      },
    });

    if (duplicate) {
      res.status(409).json({
        error: 'An open inquiry with this contact and subject already exists.',
      });
      return;
    }

    const inquiry = await prisma.inquiry.create({
      data: {
        customerName,
        customerContact,
        subject,
        description,
        createdById: req.user!.userId,
      },
      include: OWNER_INCLUDE,
    });

    res.status(201).json({ inquiry });
  } catch (error) {
    console.error('Create inquiry error:', error);
    res.status(500).json({ error: 'Failed to create inquiry' });
  }
};

export const updateInquiryStatus = async (req: AuthRequest, res: Response) => {
  const idCheck = uuidSchema.safeParse(req.params.id);
  if (!idCheck.success) {
    res.status(400).json({ error: 'Invalid inquiry ID format' });
    return;
  }

  const parsed = updateStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Invalid status update payload',
      details: z.flattenError(parsed.error).fieldErrors,
    });
    return;
  }

  const { status: nextStatus, version } = parsed.data;

  try {
    const existing = await prisma.inquiry.findUnique({ where: { id: idCheck.data } });

    if (!existing) {
      res.status(404).json({ error: 'Inquiry not found' });
      return;
    }

    if (req.user!.role !== Role.ADMIN && existing.createdById !== req.user!.userId) {
      res.status(403).json({ error: 'You do not have permission to update this inquiry' });
      return;
    }

    if (existing.version !== version) {
      res.status(409).json(STALE_DATA_RESPONSE);
      return;
    }

    if (!ALLOWED_TRANSITIONS[existing.status].includes(nextStatus)) {
      res.status(400).json({
        error: `Cannot transition inquiry from ${existing.status} to ${nextStatus}.`,
      });
      return;
    }

    const { count } = await prisma.inquiry.updateMany({
      where: { id: existing.id, version },
      data: { status: nextStatus, version: { increment: 1 } },
    });

    if (count === 0) {
      res.status(409).json(STALE_DATA_RESPONSE);
      return;
    }

    const updated = await prisma.inquiry.findUnique({
      where: { id: existing.id },
      include: OWNER_INCLUDE,
    });

    res.json({ inquiry: updated });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Failed to update inquiry status' });
  }
};
