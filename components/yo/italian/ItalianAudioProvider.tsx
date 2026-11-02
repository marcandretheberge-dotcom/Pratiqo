"use client";
import { createContext, useContext, type ReactNode } from "react";
const ItalianAudioContext = createContext<Readonly<Record<string,string>>>({});
const CourseLanguageContext = createContext<"it" | "de">("it");
/** Only paths for the current unit cross the server/client boundary. */
export function ItalianAudioProvider({paths,children,language="it"}:{paths:Readonly<Record<string,string>>;children:ReactNode;language?:"it"|"de"}){
  return <CourseLanguageContext.Provider value={language}><ItalianAudioContext.Provider value={paths}>{children}</ItalianAudioContext.Provider></CourseLanguageContext.Provider>;
}
export function useItalianAudioPath(text:string){return useContext(ItalianAudioContext)[text.normalize("NFC").trim()];}
export function useCourseLanguage(){return useContext(CourseLanguageContext);}
