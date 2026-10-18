import { describe, expect, it } from "vitest";
import { formatOrgNumber, mergeCompanyInfo, type CompanyInfo } from "../../company";

const full: CompanyInfo = {
  name: "Altinnendata",
  legalName: "Altinnendata AS",
  orgNumber: "123 456 789",
  vatRegistered: true,
  address: "Mårvegen 21a, 4347 Lye",
  streetAddress: "Mårvegen 21a",
  postalCode: "4347",
  addressLocality: "Lye",
  addressRegion: "Rogaland",
  email: "post@example.no",
  phone: "+47 400 00 000",
};

describe("mergeCompanyInfo", () => {
  it("takes the API's answer as it is", () => {
    expect(mergeCompanyInfo(full, { name: "Fallback", orgNumber: "999", vatRegistered: false })).toEqual(full);
  });

  it("uses the app's values for every field the API could not give", () => {
    const fallback = { ...full, name: "NS Tuning", legalName: "Nordmark Service AS" };
    expect(mergeCompanyInfo(null, fallback)).toEqual(fallback);
    expect(mergeCompanyInfo(undefined, { name: "Pyttogpanne" })).toEqual({
      name: "Pyttogpanne", legalName: "Pyttogpanne", orgNumber: "", vatRegistered: false, address: "",
      streetAddress: "", postalCode: "", addressLocality: "", addressRegion: "", email: "", phone: "",
    });
  });

  it("fills blank fields one by one, and keeps the API's VAT answer even when false", () => {
    const merged = mergeCompanyInfo({ ...full, legalName: "", phone: "", vatRegistered: false }, { name: "x", phone: "+47 1", vatRegistered: true });
    expect(merged).toMatchObject({ legalName: "Altinnendata", phone: "+47 1", vatRegistered: false, email: "post@example.no" });
  });

  it("falls back to the app's legal name before the name", () => {
    expect(mergeCompanyInfo({ name: "NS Tuning" }, { name: "x", legalName: "Nordmark Service AS" }).legalName).toBe("Nordmark Service AS");
    expect(mergeCompanyInfo({}, { name: "NS Tuning", vatRegistered: true })).toMatchObject({ name: "NS Tuning", legalName: "NS Tuning", vatRegistered: true });
  });
});

describe("formatOrgNumber", () => {
  it("adds MVA once VAT registered, and gives nothing without a number", () => {
    expect(formatOrgNumber({ orgNumber: "123 456 789", vatRegistered: true })).toBe("123 456 789 MVA");
    expect(formatOrgNumber({ orgNumber: "123 456 789", vatRegistered: false })).toBe("123 456 789");
    expect(formatOrgNumber({ orgNumber: "", vatRegistered: true })).toBe("");
    expect(formatOrgNumber({ orgNumber: null })).toBe("");
  });
});
