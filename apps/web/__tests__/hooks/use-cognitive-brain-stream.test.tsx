import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useCognitiveEventStream } from "@/hooks/use-cognitive-brain";

vi.mock("@/lib/api-url.js", () => ({
  getApiBase: () => "http://127.0.0.1:64010",
}));

const { MockEventSource, getInstances } = vi.hoisted(() => {
  type MsgFn = (ev: MessageEvent<string>) => void;
  type InstanceRecord = {
    url: string;
    messageFns: MsgFn[];
    openFns: (() => void)[];
    errorFns: (() => void)[];
    closed: boolean;
  };
  const instances: InstanceRecord[] = [];

  class MES {
    static readonly CONNECTING = 0;
    static readonly OPEN = 1;
    static readonly CLOSED = 2;
    readyState = MES.OPEN;
    url: string;
    private readonly record: InstanceRecord;
    private readonly messageFns: MsgFn[] = [];
    private readonly openFns: (() => void)[] = [];
    private readonly errorFns: (() => void)[] = [];

    constructor(url: string, _opts?: { withCredentials?: boolean }) {
      this.url = url;
      this.record = {
        url,
        messageFns: this.messageFns,
        openFns: this.openFns,
        errorFns: this.errorFns,
        closed: false,
      };
      instances.push(this.record);
    }

    addEventListener(type: string, fn: EventListenerOrEventListenerObject): void {
      const handler = typeof fn === "function" ? fn : fn.handleEvent.bind(fn);
      if (type === "message") this.messageFns.push(handler as MsgFn);
      if (type === "open") this.openFns.push(handler as () => void);
      if (type === "error") this.errorFns.push(handler as () => void);
    }

    removeEventListener(type: string, fn: EventListenerOrEventListenerObject): void {
      const handler = typeof fn === "function" ? fn : fn.handleEvent.bind(fn);
      if (type === "message") {
        const i = this.messageFns.indexOf(handler as MsgFn);
        if (i >= 0) this.messageFns.splice(i, 1);
      }
      if (type === "open") {
        const i = this.openFns.indexOf(handler as () => void);
        if (i >= 0) this.openFns.splice(i, 1);
      }
      if (type === "error") {
        const i = this.errorFns.indexOf(handler as () => void);
        if (i >= 0) this.errorFns.splice(i, 1);
      }
    }

    close(): void {
      this.readyState = MES.CLOSED;
      this.record.closed = true;
    }
  }

  return {
    MockEventSource: MES,
    getInstances: () => instances,
  };
});

describe("useCognitiveEventStream", () => {
  beforeEach(() => {
    getInstances().length = 0;
    vi.stubGlobal("EventSource", MockEventSource);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("apelează ultimul callback la mesaje SSE după rerender (fără actualizare ref în timpul renderului)", () => {
    const payload = JSON.stringify({
      nodeKey: "n1",
      eventType: "TEST",
      timestamp: "2026-01-01T00:00:00.000Z",
      data: {},
    });

    const first = vi.fn();
    const second = vi.fn();

    const { rerender } = renderHook(
      ({ cb }: { cb: (e: { nodeKey: string; eventType: string }) => void }) =>
        useCognitiveEventStream(cb),
      {
        initialProps: { cb: first },
      },
    );

    const inst = getInstances()[0];
    expect(inst).toBeDefined();
    expect(inst.url).toContain("/api/v1/brain/events/stream");

    for (const fn of inst.openFns) fn();

    for (const fn of inst.messageFns) {
      fn({ data: payload } as MessageEvent<string>);
    }
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();

    rerender({ cb: second });

    for (const fn of inst.messageFns) {
      fn({ data: payload } as MessageEvent<string>);
    }
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("disconnect închide EventSource-ul curent", () => {
    const cb = vi.fn();
    const { result } = renderHook(() => useCognitiveEventStream(cb));
    const inst = getInstances()[0];
    expect(inst).toBeDefined();

    result.current.disconnect();
    expect(inst.closed).toBe(true);
  });
});
