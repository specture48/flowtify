# NestJS Order Example with Flowtify

A simple, modular NestJS application demonstrating Flowtify workflow orchestration.

## Project Structure

```
src/
├── main.ts                      # Application bootstrap
├── app.module.ts                # Root module
└── order/                       # Order module
    ├── order.module.ts          # Module definition
    ├── order.controller.ts      # REST API controller
    ├── order.service.ts         # Order business logic
    ├── payment.service.ts       # Payment processing logic
    ├── dto/
    │   └── create-order.dto.ts  # Data transfer object
    └── workflows/
        ├── order.workflow.ts    # Workflow definition
        └── order.steps.ts       # Workflow steps with compensation
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

**Note**: This example uses the `nestjs-flowtify` package which provides NestJS-specific integration for Flowtify workflows.

## Running the Application

```bash
npm start
```

The server will start on http://localhost:3000

## API Usage

### Create Order

```bash
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer-123",
    "productId": "product-456",
    "quantity": 2,
    "price": 29.99
  }'
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

## Key Features

- **NestJS Integration**: Uses `nestjs-flowtify` package for seamless integration
- **Modular Structure**: Follows NestJS best practices with proper module organization
- **Dependency Injection**: Services are automatically registered and injected
- **Automatic Compensation**: Failed workflows trigger rollback in reverse order
- **Type Safety**: Full TypeScript support with DTOs and interfaces
- **Clean Separation**: Business logic, workflows, and API are properly separated

## NestJS-Flowtify Integration

This example demonstrates the proper way to integrate Flowtify with NestJS:

1. **FlowtifyModule**: Import `FlowtifyModule.forRoot()` in your app module
2. **WorkflowService**: Inject the `WorkflowService` to execute workflows
3. **Service Registration**: Register your NestJS services in the workflow container
4. **Workflow Execution**: Use `workflowService.execute()` instead of manual container setup