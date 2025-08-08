# Express.js Order Example with Flowtify

A modular Express.js application demonstrating Flowtify workflow orchestration with proper separation of concerns.

## Project Structure

```
src/
├── app.ts                       # Application entry point
├── container.ts                 # Dependency injection setup
├── controllers/
│   └── order.controller.ts      # Order request handlers
├── routes/
│   └── order.routes.ts          # Route definitions
├── services/
│   ├── order.service.ts         # Order business logic
│   └── payment.service.ts       # Payment processing logic
├── workflows/
│   ├── order.workflow.ts        # Workflow definition
│   └── order.steps.ts           # Workflow steps with compensation
└── middleware/
    └── error.middleware.ts      # Error handling middleware
```

## Workflow Steps

1. **Create Order**
   - Creates an order in the system
   - Compensation: Cancels the order

2. **Process Payment**
   - Processes payment for the order
   - Compensation: Refunds the payment

## Installation

```bash
npm install
# or
yarn install
```

## Running the Application

```bash
npm start
# or for development with auto-reload
npm run start:dev
```

The server will start on http://localhost:3000

## API Endpoints

### Create Order

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer-123",
    "productId": "product-456",
    "quantity": 2,
    "price": 29.99
  }'
```

### Get Order

```bash
curl http://localhost:3000/api/orders/order-1234567890
```

### Success Response

```json
{
  "success": true,
  "data": {
    "order": {
      "id": "order-1234567890",
      "customerId": "customer-123",
      "productId": "product-456",
      "quantity": 2,
      "total": 59.98,
      "status": "created"
    },
    "payment": {
      "id": "payment-1234567890",
      "orderId": "order-1234567890",
      "amount": 59.98,
      "status": "completed"
    }
  }
}
```

### Error Response (with automatic compensation)

```json
{
  "success": false,
  "error": "Payment processing failed"
}
```

When an error occurs, Flowtify automatically:
1. Refunds the payment (if it was processed)
2. Cancels the order
3. Executes compensation in reverse order

## Key Architecture Features

### 1. Modular Structure
- **Controllers**: Handle HTTP requests and responses
- **Services**: Contain business logic
- **Workflows**: Define process orchestration
- **Routes**: Define API endpoints
- **Middleware**: Handle cross-cutting concerns

### 2. Dependency Injection
- Global container setup in `container.ts`
- Services registered and resolved through Flowtify's Awilix adapter
- Clean separation of concerns

### 3. Error Handling
- Global error middleware for unhandled errors
- Workflow-specific error handling with compensation
- Proper HTTP status codes and error messages

### 4. Workflow Organization
- Steps defined in separate files
- Clear compensation logic for each step
- Type-safe workflow definitions

## Development Features

- **TypeScript**: Full type safety
- **Hot Reload**: Development server with nodemon
- **Error Handling**: Comprehensive error management
- **Logging**: Console logging for debugging
- **Validation**: Request validation in controllers

## Compensation Flow

If the payment step fails:
1. **Order Cancellation**: The created order is automatically cancelled
2. **Error Response**: Client receives detailed error information
3. **Logging**: All compensation actions are logged

If any step after payment fails:
1. **Payment Refund**: Payment is automatically refunded
2. **Order Cancellation**: Order is cancelled
3. **Reverse Order**: Compensation happens in reverse order

This ensures data consistency and proper cleanup of any partial state.