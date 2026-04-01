import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthenticatedRequest } from '../lib/auth';
import { writeAuditLog } from '../lib/audit';
import { getParamString } from '../lib/params';

export const petsRouter = Router();

const petSchema = z.object({
  name: z.string().min(1),
  breed: z.string().min(1),
  age: z.string().min(1),
  photoUrl: z.string().optional().nullable(),
});

petsRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const pets = await prisma.pet.findMany({
    where: { ownerId: req.userId! },
    orderBy: { createdAt: 'desc' }
  });

  res.json({ success: true, data: pets });
});

petsRouter.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const parsed = petSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid pet input' }
    });
  }

  const pet = await prisma.pet.create({
    data: {
      ownerId: req.userId!,
      ...parsed.data
    }
  });

  await writeAuditLog({
    actorUserId: req.userId!,
    action: 'PET_CREATED',
    entityType: 'Pet',
    entityId: pet.id,
    details: `Created pet ${pet.name}`,
  });

  res.json({ success: true, data: pet });
});

petsRouter.delete('/:petId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const petId = getParamString(req.params.petId);

  const pet = await prisma.pet.findFirst({
    where: {
      id: petId,
      ownerId: req.userId!
    }
  });

  if (!pet) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Pet not found' }
    });
  }

  await prisma.pet.delete({
    where: { id: pet.id }
  });

  await writeAuditLog({
    actorUserId: req.userId!,
    action: 'PET_DELETED',
    entityType: 'Pet',
    entityId: pet.id,
    details: `Deleted pet ${pet.name}`,
  });

  res.json({ success: true, data: { deleted: true } });
});