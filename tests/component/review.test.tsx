import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi, it, expect, afterEach } from "vitest";
vi.mock("../../src/app/offline", () => ({
  checkOffline: vi.fn().mockRejectedValue(new Error("Not prepared")),
  activateUpdate: vi.fn(),
  updateAvailable: false,
}));
vi.mock("../../src/ai/client", () => ({
  analyzeLocal: vi
    .fn()
    .mockRejectedValue(new Error("Worker failed. Use the manual form.")),
}));
import App from "../../src/app/App";
import * as db from "../../src/storage/db";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it("manual card requires explicit counts and confirmation; unsupported notes cannot be checked away", async () => {
  render(
    <MemoryRouter initialEntries={["/request/new?mode=form"]}>
      <App />
    </MemoryRouter>,
  );
  const queue = screen.getByRole("button", {
    name: "Preview and queue locally",
  });
  expect(queue).toBeDisabled();
  fireEvent.change(
    screen.getByLabelText(
      "Original enquiry / additional requirements (optional)",
    ),
    { target: { value: "severe peanut allergy" } },
  );
  fireEvent.click(screen.getByLabelText(/Every guest receives/));
  fireEvent.click(screen.getByLabelText(/I verified the exact/));
  expect(queue).toBeDisabled();
  expect(screen.getByText("Direct contact required")).toBeVisible();
});
it("worker failure is visible and form remains reachable", async () => {
  render(
    <MemoryRouter initialEntries={["/request/new"]}>
      <App />
    </MemoryRouter>,
  );
  fireEvent.change(screen.getByLabelText(/English enquiry/), {
    target: { value: "Can I book a visit tomorrow?" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Analyze enquiry" }));
  await screen.findByText("Worker failed. Use the manual form.");
  fireEvent.click(screen.getByRole("button", { name: "Use a form instead" }));
  expect(screen.getByLabelText("Date")).toBeVisible();
});
it("failed IndexedDB write never presents a queued request", async () => {
  const spy = vi
    .spyOn(db, "save")
    .mockRejectedValue(new DOMException("Storage full", "QuotaExceededError"));
  render(
    <MemoryRouter initialEntries={["/request/new?mode=form"]}>
      <App />
    </MemoryRouter>,
  );
  fireEvent.change(screen.getByLabelText("Date"), {
    target: {
      value: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    },
  });
  fireEvent.change(screen.getByLabelText("Time · Asia/Dhaka"), {
    target: { value: "15:00" },
  });
  for (const [label, value] of [
    ["Adults", "2"],
    ["Children (choose 0 explicitly)", "0"],
    ["Vegetarian meals (choose 0 explicitly)", "0"],
  ])
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  fireEvent.click(screen.getByLabelText(/Every guest receives/));
  fireEvent.click(screen.getByLabelText(/I verified the exact/));
  fireEvent.click(
    screen.getByRole("button", { name: "Preview and queue locally" }),
  );
  await waitFor(() => expect(spy).toHaveBeenCalled());
  await screen.findByText("Could not queue: Storage full");
  expect(
    screen.getByRole("heading", { name: "Describe your visit" }),
  ).toBeVisible();
});
