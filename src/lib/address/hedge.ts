import { isTimeout } from "./rules";

/**
 * The first answer of `primary` or `backup`. The backup only starts when the primary has not
 * answered within `afterMs`, or has failed. If both fail, the error is the primary's, but a
 * timeout of either wins, so that a slow provider still reads as "too busy".
 */
export async function hedged<T>(primary: () => Promise<T>, backup: () => Promise<T>, afterMs: number): Promise<T> {
  const first = primary();
  const second = new Promise<T>((resolve, reject) => {
    const start = () => backup().then(resolve, reject);
    const timer = setTimeout(start, afterMs);
    first.then(
      () => clearTimeout(timer),
      () => {
        clearTimeout(timer);
        start();
      },
    );
  });
  try {
    return await Promise.any([first, second]);
  } catch (error) {
    const errors = error instanceof AggregateError ? (error.errors as unknown[]) : [error];
    throw errors.find(isTimeout) ?? errors[0];
  }
}
