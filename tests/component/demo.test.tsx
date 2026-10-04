import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { it, expect, vi, afterEach } from "vitest";
vi.mock("../../src/ai/client", () => ({ analyzeLocal: vi.fn() }));
import { analyzeLocal } from "../../src/ai/client";
import InteractiveDemo from "../../src/app/demo/InteractiveDemo";
import { operatorSchema } from "../../src/domain/schema";
import operators from "../../public/data/operators/demo.json";
function start() {
  render(
    <MemoryRouter>
      <InteractiveDemo operator={operatorSchema.parse(operators[0])} />
    </MemoryRouter>,
  );
}
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it("worker failure requires an explicit preset-form choice and remains click-only", async () => {
  vi.mocked(analyzeLocal).mockRejectedValueOnce(
    new Error("Model files unavailable"),
  );
  start();
  fireEvent.click(
    screen.getByRole("button", { name: "Analyze sample request" }),
  );
  await screen.findByText("Manual review needed");
  expect(
    screen.queryByRole("button", { name: "Confirm sample details" }),
  ).not.toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: "Review preset manual form" }),
  );
  expect(
    screen.getByText("Preset manual form", { exact: true }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Confirm sample details" }),
  ).toHaveFocus();
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
});
it("restart invalidates a pending AI result and duplicate analysis clicks run only once", async () => {
  let reject!: (error: Error) => void;
  vi.mocked(analyzeLocal).mockImplementationOnce(
    () =>
      new Promise((_, rej) => {
        reject = rej;
      }),
  );
  start();
  fireEvent.click(
    screen.getByRole("button", { name: "Analyze sample request" }),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Analyzing on this device…" }),
  );
  expect(analyzeLocal).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Restart demo" }));
  reject(new Error("Late failed analysis"));
  await Promise.resolve();
  expect(
    screen.getByRole("button", { name: "Analyze sample request" }),
  ).toBeEnabled();
  expect(screen.queryByText("Manual review needed")).not.toBeInTheDocument();
  expect(screen.queryByText("Late failed analysis")).not.toBeInTheDocument();
});
