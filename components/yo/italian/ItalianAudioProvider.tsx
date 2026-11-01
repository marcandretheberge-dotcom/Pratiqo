"use client";
import { createContext, useContext, type ReactNode } from "react";
const ItalianAudioContext = createContext<Readonly<Record<string,string>>>({});
/** Only paths for the current unit cross the server/client boundary. */
export function ItalianAudioProvider({paths,children}:{paths:Readonly<Record<string,string>>;children:ReactNode}){
  return <ItalianAudioContext.Provider value={paths}>{children}</ItalianAudioContext.Provider>;
}
export function useItalianAudioPath(text:string){return useContext(ItalianAudioContext)[text.normalize("NFC").trim()];}
