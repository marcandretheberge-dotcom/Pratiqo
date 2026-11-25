"use client";
import { createContext, useContext, type ReactNode } from "react";
import type { TextCourseLanguage } from "@/lib/yo/foundations/experience";
const ItalianAudioContext = createContext<Readonly<Record<string,string>>>({});
const CourseLanguageContext = createContext<TextCourseLanguage>("it");
/** Only paths for the current unit cross the server/client boundary. */
export function ItalianAudioProvider({paths,children,language="it"}:{paths:Readonly<Record<string,string>>;children:ReactNode;language?:TextCourseLanguage}){
  return <CourseLanguageContext.Provider value={language}><ItalianAudioContext.Provider value={paths}>{children}</ItalianAudioContext.Provider></CourseLanguageContext.Provider>;
}
export function useItalianAudioPath(text:string){return useContext(ItalianAudioContext)[text.normalize("NFC").trim()];}
export function useCourseLanguage(){return useContext(CourseLanguageContext);}
