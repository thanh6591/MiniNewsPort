export class SelectorMismatchError extends Error {
  readonly retryable = false;
  constructor(message: string) {
    super(message);
    this.name = "SelectorMismatchError";
  }
}

export class HttpFetchError extends Error {
  readonly retryable: boolean;
  readonly status?: number;
  constructor(message: string, opts: { status?: number; retryable?: boolean } = {}) {
    super(message);
    this.name = "HttpFetchError";
    this.retryable = opts.retryable ?? true;
    if (opts.status !== undefined) {
      this.status = opts.status;
    }
  }
}
