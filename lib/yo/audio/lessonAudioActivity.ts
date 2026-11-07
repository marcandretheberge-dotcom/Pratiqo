/** Audio lifecycle only: no learner data, text, scores or telemetry. */
const active = new Set<symbol>();
const listeners = new Set<() => void>();
function notify() { for (const listener of listeners) listener(); }
export function lessonAudioIsBusy() { return active.size > 0; }
export function subscribeLessonAudio(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
/** Acquire before playback/loading; release on end, error, cancellation and unmount. */
export function beginLessonAudio() {
  const token = Symbol("lesson-audio");
  active.add(token); notify();
  return () => { if (active.delete(token)) notify(); };
}
