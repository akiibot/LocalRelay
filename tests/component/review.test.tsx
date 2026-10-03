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
import { analyzeLocal } from "../../src/ai/client";
import type { Scores } from "../../src/ai/features";
import * as db from "../../src/storage/db";
const uncertainScores: Scores = {
  intent: {
    booking_request: 0.2,
    availability_query: 0.15,
    price_query: 0.45,
    change_cancel: 0.05,
    directions_transport: 0.05,
    other_tourism: 0.05,
    unsupported: 0.05,
  },
  requirements: {
    vegetarian: 0.9,
    transport: 0,
    accessibility: 0,
    allergy_or_medical: 0,
    payment_condition: 0,
    other_extra_detail: 0,
  },
  thresholds: {
    vegetarian: 0.5,
    transport: 0.5,
    accessibility: 0.5,
    allergy_or_medical: 0.5,
    payment_condition: 0.5,
    other_extra_detail: 0.5,
  },
  topIntent: "price_query",
  margin: 0.25,
  ms: 1,
  modelVersion: "test-uncertain",
  intentMin: 0.55,
  marginMin: 0.05,
};
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it("uncertain routing blocks AI queueing but permits explicit manual review without losing text or fields", async () => {
  vi.mocked(analyzeLocal).mockResolvedValueOnce(uncertainScores);
  render(
    <MemoryRouter initialEntries={["/request/new"]}>
      <App />
    </MemoryRouter>,
  );
  const date = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const text = `Please tell me the total fee for 2 adults and 1 child on ${date} at 2:56 am, with 1 vegetarian meal.`;
  fireEvent.change(screen.getByLabelText(/English enquiry/), {
    target: { value: text },
  });
  fireEvent.click(screen.getByRole("button", { name: "Analyze enquiry" }));
  await screen.findByText("AI needs manual review");
  expect(screen.queryByText("Direct contact required")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Adults")).toHaveValue(2);
  expect(screen.getByLabelText("Time · Asia/Dhaka")).toHaveValue("02:56");
  fireEvent.click(screen.getByLabelText(/Every guest receives/));
  fireEvent.click(screen.getByLabelText(/I verified the exact/));
  expect(
    screen.getByRole("button", { name: "Preview and queue locally" }),
  ).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Use a form instead" }));
  expect(screen.getByLabelText(/Original enquiry/)).toHaveValue(text);
  expect(screen.getByLabelText("Adults")).toHaveValue(2);
  expect(screen.getByLabelText("Children (choose 0 explicitly)")).toHaveValue(
    1,
  );
  expect(
    screen.getByRole("button", { name: "Preview and queue locally" }),
  ).toBeDisabled();
  fireEvent.click(screen.getByLabelText(/I verified the exact/));
  expect(
    screen.getByRole("button", { name: "Preview and queue locally" }),
  ).toBeEnabled();
});
it.each(["lexical", "learned"])(
  "manual fallback retains %s unsupported requirements",
  async (source) => {
    vi.mocked(analyzeLocal).mockResolvedValueOnce({
      ...uncertainScores,
      requirements: {
        ...uncertainScores.requirements,
        transport: source === "learned" ? 0.95 : 0,
      },
    });
    render(
      <MemoryRouter initialEntries={["/request/new"]}>
        <App />
      </MemoryRouter>,
    );
    const date = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    const text = `Two adults and one child on ${date} at 2:56 am. One vegetarian meal. ${source === "lexical" ? "Peanut allergy." : "What is the total price?"}`;
    fireEvent.change(screen.getByLabelText(/English enquiry/), {
      target: { value: text },
    });
    fireEvent.click(screen.getByRole("button", { name: "Analyze enquiry" }));
    await screen.findByText("Direct contact required");
    fireEvent.click(screen.getByRole("button", { name: "Use a form instead" }));
    expect(screen.getByLabelText(/Original enquiry/)).toHaveValue(text);
    expect(screen.getByText("Direct contact required")).toBeVisible();
    fireEvent.click(screen.getByLabelText(/Every guest receives/));
    fireEvent.click(screen.getByLabelText(/I verified the exact/));
    expect(
      screen.getByRole("button", { name: "Preview and queue locally" }),
    ).toBeDisabled();
  },
);
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
