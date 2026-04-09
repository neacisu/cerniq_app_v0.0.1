/**
 * SMSAdvert.ro — contract API (fără apeluri rețea reale).
 * @see https://www.smsadvert.ro/Integrare-API-SMS/ro
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSmsAdvertSmsProvider } from "../providers/smsadvert-sms.js";
import { createSmsAdvertWithTwilioFallback } from "../providers/sms-primary-fallback.js";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("SmsAdvertSmsProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SMSADVERT_API_TOKEN = "test-token";
    delete process.env.SMSADVERT_API_URL;
  });

  afterEach(() => {
    delete process.env.SMSADVERT_API_TOKEN;
  });

  it("POST JSON cu Authorization = token și sendAsShort true; returnează msgId", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          successMessage: "ok",
          msgId: "msg-abc",
        }),
    });

    const p = createSmsAdvertSmsProvider();
    const r = await p.sendSms({
      toE164: "+40740123456",
      from: "+40123456789",
      body: "Hello there!!",
    });

    expect(r.messageId).toBe("msg-abc");
    expect(r.providerUsed).toBe("SMSADVERT");
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("smsadvert.ro");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      Authorization: "test-token",
      "Content-Type": "application/json",
    });
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.phone).toBe("+40740123456");
    expect(body.shortTextMessage).toBe("Hello there!!");
    expect(body.sendAsShort).toBe(true);
  });

  it("respinge mesaje < 3 caractere", async () => {
    const p = createSmsAdvertSmsProvider();
    await expect(p.sendSms({ toE164: "+40740123456", from: "x", body: "ab" })).rejects.toThrow(
      /at least 3/,
    );
  });
});

describe("createSmsAdvertWithTwilioFallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SMSADVERT_API_TOKEN = "t1";
    process.env.TWILIO_ACCOUNT_SID = "ACtest";
    process.env.TWILIO_AUTH_TOKEN = "tok";
  });

  afterEach(() => {
    delete process.env.SMSADVERT_API_TOKEN;
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
  });

  it("la eșec SMSAdvert folosește Twilio și marchează providerUsed TWILIO", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => JSON.stringify({ errorMessage: "down" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ sid: "SMxxx" }),
        text: async () => JSON.stringify({ sid: "SMxxx" }),
      });

    const chain = createSmsAdvertWithTwilioFallback();
    const r = await chain.sendSms({
      toE164: "+40740123456",
      from: "+401111",
      body: "Hello there!!",
    });

    expect(r.providerUsed).toBe("TWILIO");
    expect(r.messageId).toBe("SMxxx");
    expect(r.raw).toMatchObject({ smsadvertPrimaryError: expect.stringMatching(/500|down/i) });
    expect(mockFetch).toHaveBeenCalled();
  });
});
