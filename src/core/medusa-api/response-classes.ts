export class StepResponse<TOutput = any, TCompensateInput = TOutput> {
  public output?: TOutput;
  public compensateInput?: TCompensateInput;
  private _permanentFailure: boolean = false;
  private _skip: boolean = false;

  constructor(output?: TOutput, compensateInput?: TCompensateInput) {
    this.output = output;
    this.compensateInput = compensateInput !== undefined ? compensateInput : (output as any);
  }

  permanentFailure(): StepResponse<TOutput, TCompensateInput> {
    this._permanentFailure = true;
    return this;
  }

  skip(): StepResponse<TOutput, TCompensateInput> {
    this._skip = true;
    return this;
  }

  get isPermanentFailure(): boolean {
    return this._permanentFailure;
  }

  get isSkipped(): boolean {
    return this._skip;
  }
}

export class WorkflowResponse<TResult = any, THooks = any> {
  public result: TResult;
  public hooks?: THooks;

  constructor(result: TResult, options?: { hooks?: THooks }) {
    this.result = result;
    this.hooks = options?.hooks;
  }
}