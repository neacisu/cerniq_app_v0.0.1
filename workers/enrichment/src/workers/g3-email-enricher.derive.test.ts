import { describe, it, expect } from "vitest";
import { deriveG3ContactFieldsFromSources } from "./g3-email-enricher.js";

describe("deriveG3ContactFieldsFromSources", () => {
  const baseContact = {
    prenume: "Ion",
    nume: "Popescu",
    functie: "Director",
  } as const;

  it("prioritizează Clearbit față de valorile existente pe contact", () => {
    const sources = {
      clearbit: {
        person: {
          name: { givenName: "Ana", familyName: "Ionescu" },
          employment: { title: "CTO" },
        },
      },
    };
    const r = deriveG3ContactFieldsFromSources(sources, {
      ...baseContact,
      prenume: "Ion",
      nume: "Vechi",
      functie: "Vechi",
    } as never);
    expect(r.prenume).toBe("Ana");
    expect(r.nume).toBe("Ionescu");
    expect(r.functie).toBe("CTO");
  });

  it("folosește titlul FullContact dacă lipsește employment Clearbit", () => {
    const sources = {
      fullcontact: { details: { title: "Manager" } },
    };
    const r = deriveG3ContactFieldsFromSources(sources, {
      ...baseContact,
      functie: null,
    } as never);
    expect(r.functie).toBe("Manager");
  });
});
