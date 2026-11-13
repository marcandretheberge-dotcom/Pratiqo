/**
 * Daily call lifecycle shared by the Café room and its focused tests.
 * Keeps destroy/cleanup explicit so retries and unmount cannot leave orphan frames.
 * Obsolete attempts may only tear down their own call instance — never a newer one.
 */

export type CafeDailyCallHandle = {
  destroy: () => void | Promise<void>;
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

const destroyedCalls = new WeakMap<object, Promise<void>>();
const pendingTeardowns = new Set<Promise<void>>();

/** Destroy once — safe if unmount and a late stale attempt both release the same handle. */
export function destroyCafeDailyCall(
  call: CafeDailyCallHandle | null | undefined,
): Promise<void> {
  if (!call) return Promise.resolve();
  const existing = destroyedCalls.get(call);
  if (existing) return existing;

  // Daily.destroy() is asynchronous. Register before invoking it so reentrant
  // events and late attempts reuse the same teardown instead of destroying twice.
  const teardown = Promise.resolve()
    .then(() => call.destroy())
    .catch(() => {
      // A teardown failure must not become an unhandled rejection or expose
      // provider internals. A subsequent create/join still fails closed.
    });
  destroyedCalls.set(call, teardown);
  pendingTeardowns.add(teardown);
  void teardown.then(() => pendingTeardowns.delete(teardown));
  return teardown;
}

/** A new Daily singleton must wait for old instances, including across remounts. */
export async function waitForCafeDailyTeardown(): Promise<void> {
  while (pendingTeardowns.size > 0) {
    await Promise.all([...pendingTeardowns]);
  }
}

/**
 * Tear down an attempt's own Daily instance only.
 * Clears the shared slot solely when it still points at that same instance.
 */
export function releaseOwnedCafeDailyCall(
  slot: CafeDailyCallSlot,
  owned: CafeDailyCallHandle | null | undefined,
): Promise<void> {
  if (!owned) return Promise.resolve();
  if (slot.current === owned) {
    slot.current = null;
  }
  return destroyCafeDailyCall(owned);
}

/** Intentional clear of whatever is currently published (leave, retry, unmount, new join). */
export function clearCafeDailyCallSlot(slot: CafeDailyCallSlot): Promise<void> {
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
 * The actual create/join lifecycle used by CafeConversationRoom.
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
    await clearCafeDailyCallSlot(input.slot);
    await waitForCafeDailyTeardown();
    if (!input.gen.isCurrent(input.attempt)) return "aborted";

    owned = input.createCall();
    input.slot.current = owned;

    await input.join(owned);

    if (!input.gen.isCurrent(input.attempt)) {
      void releaseOwnedCafeDailyCall(input.slot, owned);
      return "aborted";
    }
    return "connected";
  } catch {
    // Must not clear a newer attempt's call if this attempt never published, or
    // if the slot already moved on to a different instance.
    void releaseOwnedCafeDailyCall(input.slot, owned);
    if (input.gen.isCurrent(input.attempt)) {
      return "failed";
    }
    return "aborted";
  }
}
