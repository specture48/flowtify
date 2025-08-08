import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';

const router = Router();
const orderController = new OrderController();

// POST /api/orders - Create a new order
router.post('/', (req, res) => orderController.createOrder(req, res));

// GET /api/orders/:id - Get order by ID
router.get('/:id', (req, res) => orderController.getOrder(req, res));

export { router as orderRouter };