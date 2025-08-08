/**
 * Composer utilities for advanced workflow composition
 * Provides parallelize, when, and transform functions for workflow composition
 */

import { StepFunction } from './types';

/**
 * Symbol used to identify parallel execution groups
 */
export const PARALLEL_SYMBOL = Symbol('parallel');

/**
 * Symbol used to identify conditional execution
 */
export const CONDITIONAL_SYMBOL = Symbol('conditional');

/**
 * Symbol used to identify data transformations
 */
export const TRANSFORM_SYMBOL = Symbol('transform');

/**
 * Parallel execution wrapper for steps
 */
export interface ParallelWrapper<T extends any[]> {
  readonly __isParallel: true;
  readonly __parallelSymbol: typeof PARALLEL_SYMBOL;
  readonly steps: T;
}

/**
 * Conditional execution wrapper
 */
export interface ConditionalWrapper<T> {
  readonly __isConditional: true;
  readonly __conditionalSymbol: typeof CONDITIONAL_SYMBOL;
  readonly condition: T;
  readonly checkFn: (input: T) => boolean | Promise<boolean>;
  then<R extends any[]>(...steps: R): ConditionalResult<T, R>;
}

/**
 * Conditional result with steps to execute
 */
export interface ConditionalResult<T, R extends any[]> {
  readonly __isConditionalResult: true;
  readonly __conditionalSymbol: typeof CONDITIONAL_SYMBOL;
  readonly condition: T;
  readonly checkFn: (input: T) => boolean | Promise<boolean>;
  readonly steps: R;
  readonly elseSteps?: any[];
  readonly elseConditions?: Array<{
    condition: any;
    checkFn: (input: any) => boolean | Promise<boolean>;
    steps: any[];
  }>;
  else<E extends any[]>(...steps: E): ConditionalResultWithElse<T, R, E>;
  elseIf<C, E extends any[]>(condition: C, checkFn?: (input: C) => boolean | Promise<boolean>): ConditionalElseIf<T, R, C, E>;
}

/**
 * Conditional result with else clause
 */
export interface ConditionalResultWithElse<T, R extends any[], E extends any[]> {
  readonly __isConditionalResult: true;
  readonly __conditionalSymbol: typeof CONDITIONAL_SYMBOL;
  readonly condition: T;
  readonly checkFn: (input: T) => boolean | Promise<boolean>;
  readonly steps: R;
  readonly elseSteps: E;
  readonly elseConditions?: Array<{
    condition: any;
    checkFn: (input: any) => boolean | Promise<boolean>;
    steps: any[];
  }>;
}

/**
 * Conditional elseIf builder
 */
export interface ConditionalElseIf<T, R extends any[], C, E extends any[]> {
  then<S extends any[]>(...steps: S): ConditionalResultWithElseIf<T, R, C, S>;
}

/**
 * Conditional result with elseIf clause
 */
export interface ConditionalResultWithElseIf<T, R extends any[], C, S extends any[]> {
  readonly __isConditionalResult: true;
  readonly __conditionalSymbol: typeof CONDITIONAL_SYMBOL;
  readonly condition: T;
  readonly checkFn: (input: T) => boolean | Promise<boolean>;
  readonly steps: R;
  readonly elseSteps?: any[];
  readonly elseConditions: Array<{
    condition: any;
    checkFn: (input: any) => boolean | Promise<boolean>;
    steps: any[];
  }>;
  else<E extends any[]>(...steps: E): ConditionalResultWithElse<T, R, E>;
  elseIf<NC, NS extends any[]>(condition: NC, checkFn?: (input: NC) => boolean | Promise<boolean>): ConditionalElseIf<T, R, NC, NS>;
}

/**
 * Transform wrapper for data transformation
 */
export interface TransformWrapper<TInput, TOutput> {
  readonly __isTransform: true;
  readonly __transformSymbol: typeof TRANSFORM_SYMBOL;
  readonly input: TInput;
  readonly transformFn: (input: TInput) => TOutput;
}

/**
 * Execute multiple steps in parallel
 * @param steps - Array of steps to execute in parallel
 * @returns Parallel wrapper containing all steps
 */
export function parallelize<T extends any[]>(...steps: T): ParallelWrapper<T> {
  return {
    __isParallel: true,
    __parallelSymbol: PARALLEL_SYMBOL,
    steps
  };
}

/**
 * Conditional execution of steps based on input
 * @param condition - The input to evaluate
 * @param checkFn - Function to determine if condition is met (can be async)
 * @returns Conditional wrapper
 */
export function when<T>(
  condition: T, 
  checkFn?: (input: T) => boolean | Promise<boolean>
): ConditionalWrapper<T> {
  const defaultCheck = (input: T) => Boolean(input);
  const finalCheckFn = checkFn || defaultCheck;
  
  return {
    __isConditional: true,
    __conditionalSymbol: CONDITIONAL_SYMBOL,
    condition,
    checkFn: finalCheckFn,
    then<R extends any[]>(...steps: R): ConditionalResult<T, R> {
      const conditionalResult: ConditionalResult<T, R> = {
        __isConditionalResult: true,
        __conditionalSymbol: CONDITIONAL_SYMBOL,
        condition,
        checkFn: finalCheckFn,
        steps,
        elseSteps: undefined,
        elseConditions: undefined,
        
        else<E extends any[]>(...elseSteps: E): ConditionalResultWithElse<T, R, E> {
          return {
            __isConditionalResult: true,
            __conditionalSymbol: CONDITIONAL_SYMBOL,
            condition,
            checkFn: finalCheckFn,
            steps,
            elseSteps,
            elseConditions: conditionalResult.elseConditions
          };
        },
        
        elseIf<C, E extends any[]>(elseCondition: C, elseCheckFn?: (input: C) => boolean | Promise<boolean>): ConditionalElseIf<T, R, C, E> {
          const elseIfCheckFn = elseCheckFn || ((input: C) => Boolean(input));
          
          return {
            then<S extends any[]>(...elseIfSteps: S): ConditionalResultWithElseIf<T, R, C, S> {
              const newElseConditions = [...(conditionalResult.elseConditions || []), {
                condition: elseCondition,
                checkFn: elseIfCheckFn,
                steps: elseIfSteps
              }];
              
              const result: ConditionalResultWithElseIf<T, R, C, S> = {
                __isConditionalResult: true,
                __conditionalSymbol: CONDITIONAL_SYMBOL,
                condition,
                checkFn: finalCheckFn,
                steps,
                elseSteps: conditionalResult.elseSteps,
                elseConditions: newElseConditions,
                
                else<E extends any[]>(...finalElseSteps: E): ConditionalResultWithElse<T, R, E> {
                  return {
                    __isConditionalResult: true,
                    __conditionalSymbol: CONDITIONAL_SYMBOL,
                    condition,
                    checkFn: finalCheckFn,
                    steps,
                    elseSteps: finalElseSteps,
                    elseConditions: newElseConditions
                  };
                },
                
                elseIf<NC, NS extends any[]>(nextCondition: NC, nextCheckFn?: (input: NC) => boolean | Promise<boolean>): ConditionalElseIf<T, R, NC, NS> {
                  const nextElseIfCheckFn = nextCheckFn || ((input: NC) => Boolean(input));
                  
                  return {
                    then<S2 extends any[]>(...nextElseIfSteps: S2): ConditionalResultWithElseIf<T, R, NC, S2> {
                      const updatedElseConditions = [...newElseConditions, {
                        condition: nextCondition,
                        checkFn: nextElseIfCheckFn,
                        steps: nextElseIfSteps
                      }];
                      
                      return {
                        __isConditionalResult: true,
                        __conditionalSymbol: CONDITIONAL_SYMBOL,
                        condition,
                        checkFn: finalCheckFn,
                        steps,
                        elseSteps: result.elseSteps,
                        elseConditions: updatedElseConditions,
                        else<E2 extends any[]>(...finalElseSteps2: E2): ConditionalResultWithElse<T, R, E2> {
                          return {
                            __isConditionalResult: true,
                            __conditionalSymbol: CONDITIONAL_SYMBOL,
                            condition,
                            checkFn: finalCheckFn,
                            steps,
                            elseSteps: finalElseSteps2,
                            elseConditions: updatedElseConditions
                          };
                        },
                        elseIf: result.elseIf
                      } as ConditionalResultWithElseIf<T, R, NC, S2>;
                    }
                  };
                }
              };
              
              return result;
            }
          };
        }
      };
      
      return conditionalResult;
    }
  };
}

/**
 * Transform data using a transformation function
 * @param input - Input data to transform
 * @param transformFn - Function to transform the data
 * @returns Transform wrapper
 */
export function transform<TInput, TOutput>(
  input: TInput,
  transformFn: (input: TInput) => TOutput
): TransformWrapper<TInput, TOutput> {
  return {
    __isTransform: true,
    __transformSymbol: TRANSFORM_SYMBOL,
    input,
    transformFn
  };
}

/**
 * Switch-case style conditional execution
 * @param switchValue - The value to switch on
 * @param cases - Array of case objects with value and steps
 * @param defaultSteps - Optional default steps if no cases match
 * @returns Conditional result for switch-case execution
 */
export function switchCase<T>(
  switchValue: T,
  cases: Array<{
    value: T | ((input: T) => boolean | Promise<boolean>);
    steps: any[];
  }>,
  defaultSteps?: any[]
): any {
  const firstMatchingCase = cases[0];
  if (!firstMatchingCase) {
    if (defaultSteps && defaultSteps.length > 0) {
      return when(switchValue, () => false).then().else(...defaultSteps);
    } else {
      return when(switchValue, () => false).then();
    }
  }

  let currentConditional: any = when(
    switchValue,
    typeof firstMatchingCase.value === 'function' 
      ? firstMatchingCase.value as (input: T) => boolean | Promise<boolean>
      : (input: T) => input === firstMatchingCase.value
  ).then(...firstMatchingCase.steps);

  // Add remaining cases as elseIf conditions
  for (let i = 1; i < cases.length; i++) {
    const caseItem = cases[i];
    currentConditional = currentConditional.elseIf(
      switchValue,
      typeof caseItem.value === 'function'
        ? caseItem.value as (input: T) => boolean | Promise<boolean>
        : (input: T) => input === caseItem.value
    ).then(...caseItem.steps);
  }

  // Add default case if provided
  if (defaultSteps && defaultSteps.length > 0) {
    currentConditional = currentConditional.else(...defaultSteps);
  }

  return currentConditional;
}

/**
 * Type guards for composer utilities
 */
export function isParallelWrapper(value: any): value is ParallelWrapper<any[]> {
  return Boolean(value && 
         typeof value === 'object' && 
         value.__isParallel === true &&
         value.__parallelSymbol === PARALLEL_SYMBOL);
}

export function isConditionalWrapper(value: any): value is ConditionalWrapper<any> {
  return Boolean(value && 
         typeof value === 'object' && 
         value.__isConditional === true &&
         value.__conditionalSymbol === CONDITIONAL_SYMBOL);
}

export function isConditionalResult(value: any): value is ConditionalResult<any, any[]> {
  return Boolean(value && 
         typeof value === 'object' && 
         value.__isConditionalResult === true &&
         value.__conditionalSymbol === CONDITIONAL_SYMBOL);
}

export function isTransformWrapper(value: any): value is TransformWrapper<any, any> {
  return Boolean(value && 
         typeof value === 'object' && 
         value.__isTransform === true &&
         value.__transformSymbol === TRANSFORM_SYMBOL);
}

/**
 * Utility to check if a value is any kind of composer wrapper
 */
export function isComposerWrapper(value: any): boolean {
  return isParallelWrapper(value) || 
         isConditionalWrapper(value) || 
         isConditionalResult(value) ||
         isTransformWrapper(value);
}