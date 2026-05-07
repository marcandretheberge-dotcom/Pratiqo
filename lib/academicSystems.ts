export type AcademicSystemConfig = {
  countryCode: string;
  regionCode?: string;
  systemId: string;
  schoolLevels: Array<{ value: string; labelKey: string }>;
  gradeLevels: Array<{ value: string; labelKey: string; schoolLevel?: string }>;
  programTracks: Array<{
    value: string;
    labelKey: string;
    parentFriendlyLabelKey?: string;
    helperKey?: string;
    appliesTo?: {
      subject?: string;
      schoolLevel?: string;
      regionCode?: string;
    };
  }>;
};

const QUEBEC_CONFIG: AcademicSystemConfig = {
  countryCode: "CA",
  regionCode: "QC",
  systemId: "canada_quebec",
  schoolLevels: [
    { value: "primary", labelKey: "schoolLevelPrimary" },
    { value: "secondary", labelKey: "schoolLevelSecondary" },
    { value: "cegep", labelKey: "schoolLevelCegep" },
    { value: "university", labelKey: "schoolLevelUniversity" },
    { value: "adult", labelKey: "schoolLevelAdult" },
    { value: "other", labelKey: "schoolLevelOther" },
  ],
  gradeLevels: [
    { value: "primaire_1", labelKey: "gradePrimary1", schoolLevel: "primary" },
    { value: "primaire_2", labelKey: "gradePrimary2", schoolLevel: "primary" },
    { value: "primaire_3", labelKey: "gradePrimary3", schoolLevel: "primary" },
    { value: "primaire_4", labelKey: "gradePrimary4", schoolLevel: "primary" },
    { value: "primaire_5", labelKey: "gradePrimary5", schoolLevel: "primary" },
    { value: "primaire_6", labelKey: "gradePrimary6", schoolLevel: "primary" },
    { value: "secondaire_1", labelKey: "gradeSecondary1", schoolLevel: "secondary" },
    { value: "secondaire_2", labelKey: "gradeSecondary2", schoolLevel: "secondary" },
    { value: "secondaire_3", labelKey: "gradeSecondary3", schoolLevel: "secondary" },
    { value: "secondaire_4", labelKey: "gradeSecondary4", schoolLevel: "secondary" },
    { value: "secondaire_5", labelKey: "gradeSecondary5", schoolLevel: "secondary" },
  ],
  programTracks: [
    { value: "regular", labelKey: "mathGeneralRegular", parentFriendlyLabelKey: "mathGeneralRegular", helperKey: "quebecMathProgramHelp" },
    { value: "technical_science", labelKey: "mathTechnicalScience", parentFriendlyLabelKey: "mathTechnicalScience", helperKey: "quebecMathProgramHelp" },
    { value: "natural_science", labelKey: "mathNaturalScience", parentFriendlyLabelKey: "mathNaturalScience", helperKey: "quebecMathProgramHelp" },
    { value: "unsure", labelKey: "programIDontKnow", parentFriendlyLabelKey: "programIDontKnow", helperKey: "quebecMathProgramHelp" },
    { value: "other", labelKey: "programOther", parentFriendlyLabelKey: "programOther", helperKey: "quebecMathProgramHelp" },
  ],
};

const GENERIC_CONFIG: AcademicSystemConfig = {
  countryCode: "*",
  systemId: "generic_international",
  schoolLevels: [
    { value: "primary", labelKey: "schoolLevelPrimary" },
    { value: "middle_school", labelKey: "schoolLevelMiddleSchool" },
    { value: "high_school", labelKey: "schoolLevelHighSchool" },
    { value: "college_university", labelKey: "schoolLevelCollegeUniversity" },
    { value: "adult", labelKey: "schoolLevelAdult" },
    { value: "other", labelKey: "schoolLevelOther" },
  ],
  gradeLevels: [],
  programTracks: [
    { value: "regular", labelKey: "programRegular" },
    { value: "advanced", labelKey: "programAdvanced" },
    { value: "ib", labelKey: "programIB" },
    { value: "exam_prep", labelKey: "programExamPrep" },
    { value: "unsure", labelKey: "programIDontKnow" },
    { value: "other", labelKey: "programOther" },
  ],
};

export function getAcademicSystemConfig(input?: {
  countryCode?: string | null;
  regionCode?: string | null;
  locale?: string | null;
}): AcademicSystemConfig {
  const country = String(input?.countryCode || "").trim().toUpperCase();
  const region = String(input?.regionCode || "").trim().toUpperCase();
  const locale = String(input?.locale || "").toLowerCase();
  if ((country === "CA" && (region === "QC" || region === "QUEBEC" || region === "QUÉBEC")) || locale.startsWith("fr")) {
    return QUEBEC_CONFIG;
  }
  return GENERIC_CONFIG;
}

export function getProgramTrackLabelKey(config: AcademicSystemConfig, value: string | null | undefined): string | null {
  if (!value) return null;
  return config.programTracks.find((track) => track.value === value)?.parentFriendlyLabelKey ||
    config.programTracks.find((track) => track.value === value)?.labelKey ||
    null;
}

export function getAcademicProgramHelperKey(config: AcademicSystemConfig): string | null {
  return config.programTracks.find((track) => track.helperKey)?.helperKey ?? null;
}
