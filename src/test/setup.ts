import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./server";

// A request with no handler fails the test, so nothing reaches a real API by accident.
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

// Every test starts clean. Shared state between tests is the main cause of flakiness.
afterEach(() => {
  cleanup(); // unmount the app (Testing Library only does this by itself with globals on)
  server.resetHandlers(); // forget the overrides of the test that just ran
  sessionStorage.clear();
});

afterAll(() => server.close());
