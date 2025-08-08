import express from 'express';
import { orderRouter } from './routes/order.routes';
import { errorHandler } from './middleware/error.middleware';
import { setupContainer } from './container';

const app = express();

// Middleware
app.use(express.json());

// Setup dependency injection container
setupContainer();

// Routes
app.use('/api/orders', orderRouter);

// Error handling
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Express + Flowtify server running on http://localhost:${PORT}`);
  console.log(`Create order: POST http://localhost:${PORT}/api/orders`);
});

export default app;