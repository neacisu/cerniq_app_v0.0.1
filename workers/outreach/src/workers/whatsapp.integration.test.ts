/**
 * Contract integrare WhatsApp — fabrici WA (fără Redis live în aceste aserțiuni).
 */
import { describe, it, expect } from "vitest";
import {
  createWaWorker,
  createWaDeliveryStatusWorker,
  createWaReadReceiptWorker,
} from "./whatsapp.js";

describe("whatsapp integration (export factories)", () => {
  it("exportă createWaWorker(phoneIndex, isFollowup, redis, luaSha)", () => {
    expect(typeof createWaWorker).toBe("function");
    expect(createWaWorker.length).toBeGreaterThanOrEqual(4);
  });

  it("exportă workeri de livrare / read receipt", () => {
    expect(typeof createWaDeliveryStatusWorker).toBe("function");
    expect(typeof createWaReadReceiptWorker).toBe("function");
  });
});
