/**
 * Scenarii k6 reutilizabile — import în scripturi:
 *   import { scenarios } from "./k6-config.js";
 */
export const scenarios = {
  ramp: {
    executor: "ramping-vus",
    startVUs: 0,
    stages: [
      { duration: "2m", target: 50 },
      { duration: "3m", target: 50 },
      { duration: "1m", target: 0 },
    ],
  },
  /** ~5 minute total — pentru CI (în loc de ramp 6m din plan). */
  ciRamp: {
    executor: "ramping-vus",
    startVUs: 0,
    stages: [
      { duration: "30s", target: 15 },
      { duration: "2m", target: 15 },
      { duration: "1m30s", target: 15 },
      { duration: "1m", target: 0 },
    ],
  },
  steady: {
    executor: "constant-vus",
    vus: 30,
    duration: "5m",
  },
  spike: {
    executor: "ramping-vus",
    startVUs: 10,
    stages: [
      { duration: "30s", target: 10 },
      { duration: "10s", target: 200 },
      { duration: "30s", target: 200 },
      { duration: "10s", target: 10 },
      { duration: "1m", target: 10 },
    ],
  },
  soak: {
    executor: "constant-vus",
    vus: 20,
    duration: "30m",
  },
};
