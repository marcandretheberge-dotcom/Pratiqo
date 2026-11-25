import { cityForRound, halfWin, passCities, type PassCity } from "./cities";
import { situationBeat } from "./situations";
import type { Interest, RailRun } from "./rail";
import { covered, owned, win, type Wallet } from "./wallet";

export function recordCheckpoint(wallet: Wallet, round: string) {
  const city = cityForRound(round);
  if (city) win(wallet, halfWin(city));
  else if (round === "bologna") win(wallet, "free-final");
  if (wallet.wins.includes("free-final")) {
    for (const stop of passCities) {
      if (wallet.wins.includes(halfWin(stop))) win(wallet, stop.stage);
    }
  }
}

export function currentRun(wallet: Wallet, city: PassCity) {
  // Keep the original Parma run readable on accounts created in the first pilot.
  return city.round === "parma" ? wallet.run : wallet.cityRuns?.[city.stage];
}

export function canPlay(wallet: Wallet, city: PassCity, now: number) {
  return wallet.wins.includes(city.stage) && (owned(wallet, city.stage, now) || covered(wallet, now));
}

export function startSituation(wallet: Wallet, city: PassCity, interest: Interest, now: number) {
  if (!canPlay(wallet, city, now)) throw Error("checkpoint");
  const previous = currentRun(wallet, city);
  if (!previous || previous.step === 4) {
    const run: RailRun = {step: 0, attempt: (previous?.attempt ?? -1) + 1, mistakes: 0, interest};
    if (city.round === "parma") wallet.run = run;
    else (wallet.cityRuns ??= {})[city.stage] = run;
  }
  if (!wallet.plays.includes(city.stage)) wallet.plays.push(city.stage);
}

export function answerSituation(wallet: Wallet, city: PassCity, now: number, step: number, attempt: number, choice: number) {
  if (!canPlay(wallet, city, now)) throw Error("checkpoint");
  const run = currentRun(wallet, city);
  if (!run || run.step !== step || run.attempt !== attempt) return "";
  const beat = situationBeat(city, run);
  if (!beat) return "";
  if (!Number.isInteger(choice) || !beat.options[choice]) throw Error("invalid_choice");
  if (choice !== beat.answer) {
    run.mistakes += 1;
    return beat.hint;
  }
  run.step += 1;
  if (run.step === 4 && !wallet.completed.includes(city.stage)) wallet.completed.push(city.stage);
  return "";
}
