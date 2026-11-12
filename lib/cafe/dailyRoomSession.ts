/**
 * Daily call lifecycle helpers for the Café room (simulated-unit friendly).
 * Keeps destroy/cleanup explicit so retries and unmount cannot leave orphan frames.
 * Obsolete attempts may only tear down their own call instance — never a newer one.
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

export type CafeDailyCallSlot = {
  current: CafeDailyCallHandle | null;
};

const destroyedCalls = new WeakSet<object>();

/** Destroy once — safe if unmount and a late stale attempt both release the same handle. */
export function destroyCafeDailyCall(
  call: CafeDailyCallHandle | null | undefined,
): null {
  if (!call) return null;
  if (destroyedCalls.has(call)) return null;
  destroyedCalls.add(call);
  try {
    call.destroy();
  } catch {
    // Ignore teardown races from Daily's iframe shutdown.
  }
  return null;
}

/**
 * Tear down an attempt's own Daily instance only.
 * Clears the shared slot solely when it still points at that same instance.
 */
export function releaseOwnedCafeDailyCall(
  slot: CafeDailyCallSlot,
  owned: CafeDailyCallHandle | null | undefined,
): null {
  if (!owned) return null;
  if (slot.current === owned) {
    slot.current = null;
  }
  return destroyCafeDailyCall(owned);
}

/** Intentional clear of whatever is currently published (leave, retry, unmount, new join). */
export function clearCafeDailyCallSlot(slot: CafeDailyCallSlot): null {
  const current = slot.current;
  slot.current = null;
  return destroyCafeDailyCall(current);
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

export type CafeDailyJoinAttemptResult = "connected" | "aborted" | "failed";

/**
 * Simulated join body used by unit tests and mirrored by CafeConversationRoom.
 * Each attempt owns its Daily handle; stale cleanup never destroys a newer call.
 */
export async function runCafeDailyJoinAttempt(input: {
  attempt: number;
  gen: CafeDailyJoinGeneration;
  slot: CafeDailyCallSlot;
  createCall: () => CafeDailyCallHandle;
  join: (call: CafeDailyCallHandle) => Promise<void>;
}): Promise<CafeDailyJoinAttemptResult> {
  let owned: CafeDailyCallHandle | null = null;
  try {
    if (!input.gen.isCurrent(input.attempt)) return "aborted";

    // Current attempt may clear leftovers before publishing its own frame.
    clearCafeDailyCallSlot(input.slot);
    if (!input.gen.isCurrent(input.attempt)) return "aborted";

    owned = input.createCall();
    input.slot.current = owned;

    await input.join(owned);

    if (!input.gen.isCurrent(input.attempt)) {
      releaseOwnedCafeDailyCall(input.slot, owned);
      return "aborted";
    }
    return "connected";
  } catch {
    // Must not clear a newer attempt's call if this attempt never published, or
    // if the slot already moved on to a different instance.
    releaseOwnedCafeDailyCall(input.slot, owned);
    if (input.gen.isCurrent(input.attempt)) {
      input.gen.invalidate();
      return "failed";
    }
    return "aborted";
  }
}
