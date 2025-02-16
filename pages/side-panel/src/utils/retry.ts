const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000,
  shouldRetry: (error: any) => boolean = error => {
    // By default, retry on 429 (Rate Limit) errors
    return error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED');
  },
): Promise<T> {
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error;
      }

      // Exponential backoff: delayMs * (2^attempt)
      const backoffMs = delayMs * Math.pow(2, attempt - 1);
      console.log(`Attempt ${attempt} failed, retrying in ${backoffMs}ms...`);
      await sleep(backoffMs);
    }
  }

  throw lastError;
}
