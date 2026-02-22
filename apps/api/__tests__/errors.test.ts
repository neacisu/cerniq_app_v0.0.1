import { describe, it, expect } from "vitest";
import {
  AppError,
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  TooManyRequestsError,
} from "../src/errors/app-error.js";

describe("AppError Hierarchy", () => {
  it("AppError has correct properties", () => {
    const err = new AppError("test", 500, "TEST");
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe("TEST");
    expect(err.message).toBe("test");
    expect(err.isOperational).toBe(true);
  });
  it("BadRequestError has status 400", () => {
    expect(new BadRequestError().statusCode).toBe(400);
  });
  it("NotFoundError has status 404", () => {
    expect(new NotFoundError().statusCode).toBe(404);
  });
  it("UnauthorizedError has status 401", () => {
    expect(new UnauthorizedError().statusCode).toBe(401);
  });
  it("ForbiddenError has status 403", () => {
    expect(new ForbiddenError().statusCode).toBe(403);
  });
  it("ConflictError has status 409", () => {
    expect(new ConflictError().statusCode).toBe(409);
  });
  it("TooManyRequestsError has status 429", () => {
    expect(new TooManyRequestsError().statusCode).toBe(429);
  });
});
