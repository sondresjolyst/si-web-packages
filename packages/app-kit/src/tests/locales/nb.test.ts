import { describe, expect, it } from "vitest";
import {
  defaultAdminUsersPanelStrings,
  defaultCompanySettingsFormStrings,
  defaultEmailStatsPanelStrings,
  defaultLegalPageKeyLabels,
  defaultLegalPagesEditorStrings,
  defaultStatHistoryChartStrings,
} from "../../admin";
import { defaultBrandingManagerStrings } from "../../branding";
import { defaultLegalPageViewStrings } from "../../legal";
import * as nb from "../../locales/nb";
import { defaultSectionTypeLabels, defaultSectionsEditorStrings } from "../../sections";
import { defaultCredentialsFormStrings, defaultLoginPageStrings, defaultSessionExpiryGuardStrings } from "../../session/react";
import { defaultErrorStateStrings, defaultNotFoundStateStrings, defaultResetPasswordFlowStrings } from "../../ui";
import { defaultPasswordStrings, passwordProblems, passwordSchema } from "../../validation";
import { packagesImportedBy } from "../importGraph";

// Each Norwegian set next to the English defaults it stands in for.
const pairs: [string, object, object][] = [
  ["nbPasswordStrings", nb.nbPasswordStrings, defaultPasswordStrings],
  ["nbCredentialsFormStrings", nb.nbCredentialsFormStrings, defaultCredentialsFormStrings],
  ["nbLoginPageStrings", nb.nbLoginPageStrings, defaultLoginPageStrings],
  ["nbSessionExpiryGuardStrings", nb.nbSessionExpiryGuardStrings, defaultSessionExpiryGuardStrings],
  ["nbResetPasswordFlowStrings", nb.nbResetPasswordFlowStrings, defaultResetPasswordFlowStrings],
  ["nbErrorStateStrings", nb.nbErrorStateStrings, defaultErrorStateStrings],
  ["nbNotFoundStateStrings", nb.nbNotFoundStateStrings, defaultNotFoundStateStrings],
  ["nbCompanySettingsFormStrings", nb.nbCompanySettingsFormStrings, defaultCompanySettingsFormStrings],
  ["nbAdminUsersPanelStrings", nb.nbAdminUsersPanelStrings, defaultAdminUsersPanelStrings],
  ["nbLegalPagesEditorStrings", nb.nbLegalPagesEditorStrings, defaultLegalPagesEditorStrings],
  ["nbStatHistoryChartStrings", nb.nbStatHistoryChartStrings, defaultStatHistoryChartStrings],
  ["nbEmailStatsPanelStrings", nb.nbEmailStatsPanelStrings, defaultEmailStatsPanelStrings],
  ["nbBrandingManagerStrings", nb.nbBrandingManagerStrings, defaultBrandingManagerStrings],
  ["nbLegalPageViewStrings", nb.nbLegalPageViewStrings, defaultLegalPageViewStrings],
  ["nbSectionsEditorStrings", nb.nbSectionsEditorStrings, defaultSectionsEditorStrings],
  ["nbSectionTypeLabels", nb.nbSectionTypeLabels, defaultSectionTypeLabels],
  ["nbLegalPageKeyLabels", nb.nbLegalPageKeyLabels, defaultLegalPageKeyLabels],
];

/** Every text of a set with its path, such as `validation.tooLong`, so nested codes count too. */
function texts(set: object, prefix = ""): [string, unknown][] {
  return Object.entries(set).flatMap(([key, value]) =>
    value && typeof value === "object" ? texts(value, `${prefix}${key}.`) : [[`${prefix}${key}`, value] as [string, unknown]],
  );
}

const placeholders = (text: unknown) => (typeof text === "string" ? (text.match(/\{\w+\}/g) ?? []).sort() : []);

describe("the Norwegian strings", () => {
  it("cover every component that takes strings, and nothing else", () => {
    expect(Object.keys(nb).sort()).toEqual(pairs.map(([name]) => name).sort());
  });

  it.each(pairs)("%s has exactly the keys of the English defaults", (_name, set, defaults) => {
    expect(texts(set).map(([key]) => key).sort()).toEqual(texts(defaults).map(([key]) => key).sort());
  });

  it.each(pairs)("%s keeps each placeholder the component fills in", (_name, set, defaults) => {
    const english = Object.fromEntries(texts(defaults));
    for (const [key, text] of texts(set)) expect([key, placeholders(text)]).toEqual([key, placeholders(english[key])]);
  });

  it.each(pairs)("%s leaves nothing blank or in English, and is not null where English has a text", (_name, set, defaults) => {
    const english = Object.fromEntries(texts(defaults));
    for (const [key, text] of texts(set)) {
      expect([key, typeof text]).toEqual([key, "string"]);
      expect([key, (text as string).trim() === ""]).toEqual([key, false]);
      if (key !== "code" && key !== "logo" && english[key] !== "") expect([key, text === english[key]]).toEqual([key, false]);
    }
  });

  it("words the field errors like Altinn and never with Høyst", () => {
    const all = pairs.flatMap(([, set]) => texts(set).map(([, text]) => String(text)));

    expect(all.filter(text => /høyst/i.test(text))).toEqual([]);
    expect(all.filter(text => /[\u2013\u2014;]/.test(text))).toEqual([]);
    expect(nb.nbCompanySettingsFormStrings.validation.tooLong).toBe("Bruk {max} eller færre tegn.");
    expect(nb.nbLegalPagesEditorStrings.validation.tooLong).toBe("Bruk {max} eller færre tegn.");
    expect(nb.nbCompanySettingsFormStrings.validation.required).toMatch(/^Du må fylle ut /);
    expect(nb.nbBrandingManagerStrings.validation.invalidImage).toBe("Ugyldig filformat. Last opp en bildefil.");
  });

  it("give the password rules in Norwegian to passwordSchema and passwordProblems", () => {
    const issues = passwordSchema(nb.nbPasswordStrings).safeParse("abc").error?.issues.map(i => i.message);

    expect(issues).toEqual([nb.nbPasswordStrings.tooShort, nb.nbPasswordStrings.uppercase, nb.nbPasswordStrings.digit]);
    expect(passwordProblems("ABCDEFGH1", nb.nbPasswordStrings)).toEqual([nb.nbPasswordStrings.lowercase]);
    expect(nb.nbPasswordStrings.tooShort).toContain("8 tegn");
    // Skatteetaten names the field first, then says what is wrong and how to fix it.
    expect(Object.values(nb.nbPasswordStrings).filter(text => !/^Passordet [^.]+\. \S/.test(text))).toEqual([]);
  });

  it("need no peer dependency, so a server component can import them", () => {
    expect([...packagesImportedBy("locales/nb.ts")]).toEqual([]);
  });
});
