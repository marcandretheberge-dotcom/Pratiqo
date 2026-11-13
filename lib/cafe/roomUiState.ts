/**
 * Café conversation-room UI state machine (PR3b).
 * Presence alone never awards mastery, stamps, or Yo credit.
 */

export type CafeRoomPhase =
  | "welcome"
  | "media_prep"
  | "joining"
  | "connected"
  | "reconnecting"
  | "error"
  | "left";

export type CafeRoomMode = "live" | "demo";

export type CafeRoomUiState = {
  phase: CafeRoomPhase;
  mode: CafeRoomMode;
  cameraArmed: boolean;
  micArmed: boolean;
  errorCode: string | null;
};

export function initialCafeRoomUiState(mode: CafeRoomMode = "demo"): CafeRoomUiState {
  return {
    phase: "welcome",
    mode,
    cameraArmed: false,
    micArmed: false,
    errorCode: null,
  };
}

export function cafeRoomReduce(
  state: CafeRoomUiState,
  action:
    | { type: "start_media_prep" }
    | { type: "toggle_camera" }
    | { type: "toggle_mic" }
    | { type: "request_join" }
    | { type: "join_succeeded" }
    | { type: "join_failed"; code: string }
    | { type: "connection_lost" }
    | { type: "reconnected" }
    | { type: "leave" }
    | { type: "return_welcome" },
): CafeRoomUiState {
  switch (action.type) {
    case "start_media_prep":
      if (state.phase !== "welcome" && state.phase !== "error" && state.phase !== "left") {
        return state;
      }
      return { ...state, phase: "media_prep", errorCode: null };
    case "toggle_camera":
      if (state.phase !== "media_prep" && state.phase !== "connected") return state;
      return { ...state, cameraArmed: !state.cameraArmed };
    case "toggle_mic":
      if (state.phase !== "media_prep" && state.phase !== "connected") return state;
      return { ...state, micArmed: !state.micArmed };
    case "request_join":
      if (state.phase !== "media_prep") return state;
      return { ...state, phase: "joining", errorCode: null };
    case "join_succeeded":
      if (state.phase !== "joining" && state.phase !== "reconnecting") return state;
      return { ...state, phase: "connected", errorCode: null };
    case "join_failed":
      return { ...state, phase: "error", errorCode: action.code };
    case "connection_lost":
      if (state.phase !== "connected") return state;
      return { ...state, phase: "reconnecting", errorCode: null };
    case "reconnected":
      if (state.phase !== "reconnecting") return state;
      return { ...state, phase: "connected", errorCode: null };
    case "leave":
      return {
        ...state,
        phase: "left",
        cameraArmed: false,
        micArmed: false,
        errorCode: null,
      };
    case "return_welcome":
      return initialCafeRoomUiState(state.mode);
    default:
      return state;
  }
}

/** Camera/mic stay off until the learner explicitly arms them in media_prep. */
export function cafeRoomMediaDefaults() {
  return { cameraArmed: false, micArmed: false } as const;
}
