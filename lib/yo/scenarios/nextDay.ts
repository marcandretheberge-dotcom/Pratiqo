/** A calendar day on the learner's device, not a fixed 24-hour timer. */
export function nextMidnight(now: number) {
  const d = new Date(now);
  return new Date(d.getFullYear(),d.getMonth(),d.getDate()+1).getTime();
}
