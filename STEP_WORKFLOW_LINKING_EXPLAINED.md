# 🔗 How Steps Link with Workflows in Medusa Pattern

## 🤔 **The Question**: How are steps connected to workflows in the new setup?

The new Medusa-style approach uses a **function-based composition pattern** that's quite different from traditional workflow builders. Here's how it works:

## 🎯 **The Magic: Function Interception Pattern**

### **Step 1: Creating a Step Function**
```typescript
const createBranchStep = createStep(
  "create-branch",
  async (input, { container }) => {
    const posService = container.resolve("POS_MODULE");
    const branch = await posService.createBranches(input);
    return new StepResponse(branch, branch);
  }
);
```

**What happens internally:**
- `createStep` returns a **special function** with hidden metadata
- This function has `__stepId` and `__stepDefinition` properties attached
- When called normally, it returns a placeholder object

### **Step 2: Composing the Workflow**
```typescript
const createBranchWorkflow = createWorkflow(
  "create-branch",
  function (workflowInput) {
    const createdBranch = createBranchStep(workflowInput);  // ← Step called here!
    return new WorkflowResponse(createdBranch);
  }
);
```

**The Key Insight**: Steps are **called directly** inside the workflow composer function, just like regular functions!

### **Step 3: Execution Time Magic**
```typescript
const { result } = await createBranchWorkflow(container).run({
  input: { name: "Downtown Branch", store_id: "store-456" }
});
```

**What happens during execution:**
1. **Composer Analysis**: The workflow engine calls the composer function first to discover what steps are used
2. **Step Interception**: The engine **intercepts** all step function calls
3. **Real Execution**: Instead of running placeholder code, it executes the actual step logic
4. **Result Chaining**: Outputs from previous steps become inputs for next steps

## 🔍 **Detailed Flow Breakdown**

### **Phase 1: Registration & Discovery**
```typescript
// 1. Step registration
const step = createStep("my-step", async (input) => { /* logic */ });
//    ↓
//    Creates function with metadata: step.__stepId, step.__stepDefinition

// 2. Workflow registration  
const workflow = createWorkflow("my-workflow", function(input) {
  const result = step(input);  // ← This gets intercepted!
  return new WorkflowResponse(result);
});
//    ↓
//    Stores composer function and analyzes step dependencies
```

### **Phase 2: Execution & Interception**
```typescript
// 3. Workflow execution
await workflow(container).run({ input: data });
//    ↓
//    Workflow engine takes over:

// 3a. Replace step functions with interceptors
originalStep = step;
step = async (input) => {
  // Execute REAL step logic, not placeholder
  const result = await originalStep.__stepDefinition.invoke(input, context);
  return result.output;  // Return actual data for next steps
};

// 3b. Run composer function with intercepted steps
const composerResult = composer(inputData);  // Steps now execute for real!

// 3c. Return final result
return { result: composerResult.result };
```

## 🔧 **The Interception Mechanism**

### **How Step Functions Work**

```typescript
// When you create a step:
const stepFunction = function(input) {
  // PLACEHOLDER CODE (never actually runs in workflow)
  return {
    __stepId: "my-step",
    __stepInput: input,
    __stepDefinition: { invoke: actualLogic, compensate: rollbackLogic },
    __isStepCall: true
  };
};
stepFunction.__stepId = "my-step";
stepFunction.__stepDefinition = { invoke: actualLogic, compensate: rollbackLogic };
```

### **During Workflow Execution**

```typescript
// The workflow engine intercepts and replaces:
const interceptor = async (stepInput) => {
  const stepContext = { container, metadata };
  
  // Execute REAL step logic (not placeholder)
  const stepResponse = await stepFunction.__stepDefinition.invoke(stepInput, stepContext);
  
  // Track for compensation if needed
  executedSteps.push({ stepId, output: stepResponse.output, compensateInput: stepResponse.compensateInput });
  
  // Return actual data for use in workflow
  return stepResponse.output;
};
```

## 🌟 **Why This Approach is Brilliant**

### **1. Natural Code Flow**
```typescript
// Looks like regular function calls!
const workflow = createWorkflow("example", function(input) {
  const user = createUserStep(input);           // Step 1
  const order = createOrderStep({ user });      // Step 2 uses Step 1 output
  const payment = processPaymentStep({ order }); // Step 3 uses Step 2 output
  
  return new WorkflowResponse({ user, order, payment });
});
```

### **2. Type Safety**
- TypeScript can infer types between steps
- No manual type declarations needed
- IDE autocomplete works perfectly

### **3. Exact Medusa Compatibility**
- Same API as Medusa workflows
- Same execution patterns
- Drop-in replacement capability

## 🔄 **Step Execution Flow**

```mermaid
graph TD
    A[createStep] --> B[Returns StepFunction with metadata]
    B --> C[Used in workflow composer]
    C --> D[workflow.run() called]
    D --> E[Engine analyzes composer]
    E --> F[Intercepts step function calls]
    F --> G[Executes real step logic]
    G --> H[Chains results to next steps]
    H --> I[Returns final workflow result]
```

## 📝 **Real Example: Step Chaining**

```typescript
// Step definitions
const step1 = createStep("add-ten", async (input: { value: number }) => {
  return new StepResponse({ value: input.value + 10 });
});

const step2 = createStep("multiply-two", async (input: { value: number }) => {
  return new StepResponse({ value: input.value * 2 });
});

// Workflow composition
const chainWorkflow = createWorkflow("chain-example", function(input) {
  const result1 = step1(input);        // Gets { value: 15 } if input was { value: 5 }
  const result2 = step2(result1);      // Gets { value: 30 } from (5+10)*2
  return new WorkflowResponse(result2);
});

// Execution
const { result } = await chainWorkflow(container).run({ 
  input: { value: 5 } 
});
// result = { value: 30 }
```

## 🎭 **The "Magic" Explained**

The key insight is that **step functions act as placeholders during composition** but get **dynamically replaced with real execution logic** when the workflow runs. This allows:

1. **Natural syntax**: Steps look like function calls
2. **Automatic discovery**: Engine knows what steps are used
3. **Type safety**: TypeScript sees the data flow
4. **Medusa compatibility**: Exact same API pattern

This is much more elegant than traditional workflow builders where you manually register steps and define connections! 🚀