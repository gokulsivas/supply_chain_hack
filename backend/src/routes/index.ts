// Replace: backend/src/routes/index.ts (full replacement, not an append)
import { Router } from 'express';
import { authRouter } from './auth.routes';
import { procurementRouter } from './procurement.routes';

export const router = Router();

router.use('/auth', authRouter);
router.use('/procurement', procurementRouter);

// Still to build, one module at a time:
// router.use('/suppliers', supplierRouter);
// router.use('/purchase-orders', purchaseOrderRouter);
// router.use('/shipments', shipmentRouter);
// router.use('/trucks', truckRouter);
// router.use('/docks', dockRouter);
// router.use('/goods-receipts', goodsReceiptRouter);
// router.use('/invoices', invoiceRouter);
// router.use('/three-way-match', matchRouter);
// router.use('/payments', paymentRouter);
// router.use('/alerts', alertRouter);