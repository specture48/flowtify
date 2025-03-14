# Flowtify

`Flowtify` is a flexible and robust TypeScript library for defining and executing workflows. It supports sequential and parallel steps, compensation handling, dependency injection, and nested workflows. It is designed to be extensible, type-safe, and easy to use.

---

## Features

- **Sequential and Parallel Steps:** Execute steps in sequence or concurrently.
- **Compensation Handling:** Automatically undo steps if a workflow fails.
- **Nested Workflows:** Compose workflows by embedding one workflow as a step within another.
- **Dependency Injection:** Integrates with `Awilix` for resolving dependencies.
- **Dynamic Input Resolution:** Resolve step inputs dynamically from the workflow context.
- **Type Safety:** Built with TypeScript for type-safe workflows.
- **Error Handling:** Fail-fast behavior with proper error propagation.
- **Extensibility:** Add custom step types and containers.

---

## Installation

Install the package using npm or yarn:

```bash
npm install flowtify
```

or

```bash
yarn add flowtify
```

---

## Usage

### Basic Example

```typescript
import { WorkflowBuilder } from "flowtify";

const workflow = new WorkflowBuilder()
    .addStep("step1", {
        execute: (input) => input + 1,
    })
    .addStep("step2", {
        execute: (input) => input * 2,
    });

const result = await workflow.execute(1);
console.log(result); // Output: 4
```

### Parallel Steps

```typescript
const workflow = new WorkflowBuilder()
    .addParallel({
        step1: {
            execute: (input) => input + 1,
        },
        step2: {
            execute: (input) => input * 2,
        },
    });

const result = await workflow.execute(1);
console.log(result); // Output: { step1: 2, step2: 2 }
```

### Compensation Handling

```typescript
const workflow = new WorkflowBuilder()
    .addStep("step1", {
        execute: (input) => input + 1,
        compensate: (output) => console.log(`Compensating step1 with output: ${output}`),
    })
    .addStep("step2", {
        execute: () => {
            throw new Error("Step 2 failed");
        },
    });

await workflow.execute(1); // Compensation for step1 will be triggered.
```

### Nested Workflows

```typescript
const childWorkflow = new WorkflowBuilder()
    .addStep("childStep1", {
        execute: (input) => input + 1,
    });

const parentWorkflow = new WorkflowBuilder()
    .addStep("parentStep1", {
        execute: (input) => input + 1,
    })
    .addStep("nestedWorkflow", childWorkflow.runAsStep("nestedWorkflow"));

const result = await parentWorkflow.execute(1);
console.log(result); // Output: 3
```

### Dependency Injection

```typescript
import { createContainer, asClass } from "awilix";

const container = createContainer();
container.register({
    userService: asClass(UserService).scoped(),
});

const workflow = new WorkflowBuilder(container)
    .addStep("step1", {
        execute: (input, context, container) => {
            const userService = container.resolve("userService");
            return userService.process(input);
        },
    });

await workflow.execute(1);
```

---

## API Reference

### `WorkflowBuilder<TInput, TOutput>`

- **`addStep(key: string, step: WorkflowStep, inputResolver?: (context: WorkflowContext) => any)`**
    - Adds a sequential step to the workflow.
    - `key`: A unique identifier for the step.
    - `step`: The step definition (must include an `execute` method and optionally a `compensate` method).
    - `inputResolver`: A function to dynamically resolve the step's input from the context.

- **`addParallel(steps: Record<string, WorkflowStep>, inputResolvers?: Record<string, (context: WorkflowContext) => any>)`**
    - Adds parallel steps to the workflow.
    - `steps`: A key-value pair of step definitions.
    - `inputResolvers`: A key-value pair of input resolver functions for each step.

- **`runAsStep(key: string, inputResolver?: (context: WorkflowContext) => any)`**
    - Converts the workflow into a step that can be used in another workflow.
    - `key`: A unique identifier for the nested workflow.
    - `inputResolver`: A function to dynamically resolve the nested workflow's input from the context.

- **`execute(input: TInput): Promise<TOutput>`**
    - Executes the workflow and returns the final output.
    - `input`: The initial input for the workflow.

---

## Contributing

We welcome contributions! Please read our [Contributing Guide](CONTRIBUTING.md) for details on how to get started.

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## Support

If you encounter any issues or have questions, please [open an issue](https://github.com/your-repo/flowtify/issues) on GitHub.

---

## Acknowledgments

- Thanks to the `Awilix` team for providing an excellent dependency injection library.
- Inspired by workflow patterns in distributed systems and event-driven architectures.

---

This `README.md` provides a comprehensive overview of `flowtify`, including installation instructions, usage examples, API reference, and contribution guidelines. Let me know if you’d like to add or modify anything!