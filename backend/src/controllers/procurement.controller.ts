// Save as: backend/src/controllers/procurement.controller.ts
import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { extractRequisition } from '../services/gemini.service';

const requisitionSchema = z.object({
  item: z.string().min(1, 'Item is required'),
  quantity: z.coerce.number().int().positive('Quantity must be greater than 0'),
  deliveryLocation: z.string().min(1, 'Delivery location is required'),
  requiredDate: z
    .string()
    .refine((d) => !isNaN(Date.parse(d)), 'Invalid date')
    .refine(
      (d) => new Date(d) >= new Date(new Date().toDateString()),
      'Delivery date must not be in the past'
    ),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
});

// Step 3-4: Chatbot extraction + validation (does NOT save to DB yet)
export const extractFromChat = asyncHandler(async (req: Request, res: Response) => {
  const { message } = req.body;
  if (!message || typeof message !== 'string') {
    throw new ApiError(400, 'message is required');
  }

  const extracted = await extractRequisition(message);
  const validation = requisitionSchema.safeParse(extracted);

  res.json({
    success: true,
    data: {
      extracted,
      isValid: validation.success,
      errors: validation.success ? null : validation.error.format(),
    },
  });
});

async function findOrCreateProduct(name: string) {
  const sku = name.trim().toUpperCase().replace(/\s+/g, '-');
  let product = await prisma.product.findUnique({ where: { sku } });
  if (!product) {
    product = await prisma.product.create({
      data: { name, sku, unitPrice: 0 },
    });
  }
  return product;
}

// Step 5: Save validated Purchase Request to PostgreSQL
export const createPurchaseRequest = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Unauthorized');
  }

  const parsed = requisitionSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, 'Validation failed', parsed.error.format());
  }

  const { item, quantity, deliveryLocation, requiredDate, priority } = parsed.data;

  const product = await findOrCreateProduct(item);
  const requestCode = `REQ${String(Date.now()).slice(-6)}`;

  const pr = await prisma.purchaseRequest.create({
    data: {
      requestCode,
      userId: req.user.id,
      deliveryLocation,
      requiredDate: new Date(requiredDate),
      priority,
      status: 'VALIDATED',
      rawChatInput: req.body.rawMessage ?? null,
      extractedJson: parsed.data,
      items: {
        create: [{ productId: product.id, quantity }],
      },
    },
    include: { items: { include: { product: true } } },
  });

  res.status(201).json({ success: true, data: pr });
});