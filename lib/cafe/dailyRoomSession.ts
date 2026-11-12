/**
 * Daily call lifecycle helpers for the Café room (simulated-unit friendly).
 * Keeps destroy/cleanup explicit so retries and unmount cannot leave orphan frames.
 */

export type CafeDailyCallHandle = {
  destroy: () => void;
  join: (opts: {
    url: string;
    token: string;
    startVideoOff: boolean;
    startAudioOff: boolean;
  }) => Promise<void>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
};

export function destroyCafeDailyCall(
  call: CafeDailyCallHandle | null | undefined,
): null {
  if (!call) return null;
  try {
    call.destroy();
  } catch {
    // Ignore teardown races from Daily's iframe shutdown.
  }
  return null;
}

/**
 * Monotonic join attempt tracker: after leave/unmount/error, bump the generation
 * so late async join resolution cannot connect or update UI.
 */
export class CafeDailyJoinGeneration {
  private generation = 0;

  current(): number {
    return this.generation;
  }

  /** Invalidate in-flight work (leave, unmount, hard error, retry prep). */
  invalidate(): number {
    this.generation += 1;
    return this.generation;
  }

  beginAttempt(): number {
    this.generation += 1;
    return this.generation;
  }

  isCurrent(attempt: number): boolean {
    return attempt === this.generation;
  }
}
