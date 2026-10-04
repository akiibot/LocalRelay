import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { vi, it, expect, afterEach, beforeEach, beforeAll } from "vitest";
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
import * as study from "../../src/evaluation/study";
import { beginStudy, studyResults } from "../../src/evaluation/study";
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
beforeAll(() => {
  window.scrollTo = vi.fn();
  HTMLElement.prototype.scrollIntoView = vi.fn();
});
beforeEach(async () => {
  await db.clearAll();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
const date = () =>
  new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
function start(path = "/request/new?mode=form") {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}
async function fillCard() {
  fireEvent.change(await screen.findByLabelText("Date"), {
    target: { value: date() },
  });
  fireEvent.change(screen.getByLabelText("Time"), {
    target: { value: "15:00" },
  });
  for (const [label, value] of [
    ["Adults", "2"],
    ["Children (choose 0 explicitly)", "0"],
    ["Vegetarian meals (choose 0 explicitly)", "0"],
  ])
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
}
function reviewCard() {
  fireEvent.click(screen.getByRole("button", { name: /^Review request/ }));
}
function confirmCard() {
  fireEvent.click(screen.getByLabelText(/Every guest receives/));
  fireEvent.click(screen.getByLabelText(/I verified the exact/));
}
const saveButton = () =>
  screen.getByRole("button", { name: "Save request on this device" });
it("uncertain routing blocks AI saving but allows explicit manual review without losing fields or text", async () => {
  vi.mocked(analyzeLocal).mockResolvedValueOnce(uncertainScores);
  start("/request/new");
  const text = `Please tell me the total fee for 2 adults and 1 child on ${date()} at 2:56 am, with 1 vegetarian meal.`;
  fireEvent.change(await screen.findByLabelText(/English enquiry/), {
    target: { value: text },
  });
  fireEvent.click(screen.getByRole("button", { name: "Analyze enquiry" }));
  await screen.findByText("AI needs manual review");
  expect(screen.queryByText("Direct contact required")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Adults")).toHaveValue(2);
  expect(screen.getByLabelText("Time")).toHaveValue("02:56");
  reviewCard();
  confirmCard();
  expect(saveButton()).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Edit details" }));
  fireEvent.click(screen.getByRole("button", { name: "Use a form instead" }));
  expect(screen.getByLabelText(/Original enquiry/)).toHaveValue(text);
  expect(screen.getByLabelText("Children (choose 0 explicitly)")).toHaveValue(
    1,
  );
  reviewCard();
  expect(saveButton()).toBeDisabled();
  confirmCard();
  expect(saveButton()).toBeEnabled();
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
    start("/request/new");
    const text = `Two adults and one child on ${date()} at 2:56 am. One vegetarian meal. ${source === "lexical" ? "Peanut allergy." : "What is the total price?"}`;
    fireEvent.change(await screen.findByLabelText(/English enquiry/), {
      target: { value: text },
    });
    fireEvent.click(screen.getByRole("button", { name: "Analyze enquiry" }));
    await screen.findByText("Direct contact required");
    fireEvent.click(screen.getByRole("button", { name: "Use a form instead" }));
    expect(screen.getByLabelText(/Original enquiry/)).toHaveValue(text);
    reviewCard();
    confirmCard();
    expect(saveButton()).toBeDisabled();
  },
);
it("missing explicit counts fail review and unsupported notes cannot be checked away", async () => {
  start();
  await screen.findByLabelText("Date");
  reviewCard();
  expect(
    screen.getByLabelText("Children (choose 0 explicitly)"),
  ).toHaveAttribute("aria-invalid", "true");
  expect(
    screen.queryByRole("button", { name: "Save request on this device" }),
  ).not.toBeInTheDocument();
  await fillCard();
  fireEvent.change(screen.getByLabelText(/Original enquiry/), {
    target: { value: "severe peanut allergy" },
  });
  reviewCard();
  confirmCard();
  expect(saveButton()).toBeDisabled();
  expect(screen.getByText("Direct contact required")).toBeVisible();
});
it("worker failure is visible and form remains reachable", async () => {
  start("/request/new");
  fireEvent.change(await screen.findByLabelText(/English enquiry/), {
    target: { value: "Can I book a visit tomorrow?" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Analyze enquiry" }));
  await screen.findByText("Worker failed. Use the manual form.");
  fireEvent.click(screen.getByRole("button", { name: "Use a form instead" }));
  expect(screen.getByLabelText("Date")).toBeVisible();
});
it("failed IndexedDB write leaves reviewed values available without presenting a saved record", async () => {
  const spy = vi
    .spyOn(db, "save")
    .mockRejectedValue(new DOMException("Storage full", "QuotaExceededError"));
  start();
  await fillCard();
  reviewCard();
  confirmCard();
  fireEvent.click(saveButton());
  await screen.findByText("Could not save request: Storage full");
  expect(spy).toHaveBeenCalledTimes(1);
  expect(
    screen.getByRole("heading", { name: "Review your request" }),
  ).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Edit details" }));
  expect(screen.getByLabelText("Adults")).toHaveValue(2);
});
it("review does not save; returning to edit invalidates confirmations and retains values", async () => {
  const spy = vi.spyOn(db, "save");
  start();
  await fillCard();
  reviewCard();
  confirmCard();
  expect(saveButton()).toBeEnabled();
  expect(spy).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Edit details" }));
  expect(screen.getByLabelText("Children (choose 0 explicitly)")).toHaveValue(
    0,
  );
  fireEvent.change(screen.getByLabelText("Adults"), { target: { value: "3" } });
  reviewCard();
  expect(saveButton()).toBeDisabled();
  expect(screen.getByLabelText(/I verified the exact/)).not.toBeChecked();
  expect(screen.getByLabelText(/Every guest receives/)).not.toBeChecked();
});
it("repeated clicks during a pending save produce only one write", async () => {
  let reject!: (reason: Error) => void;
  const spy = vi.spyOn(db, "save").mockImplementation(
    () =>
      new Promise((_, rej) => {
        reject = rej;
      }),
  );
  start();
  await fillCard();
  reviewCard();
  confirmCard();
  fireEvent.click(saveButton());
  await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
  const pending = screen.getByRole("button", {
    name: "Saving on this device…",
  });
  expect(pending).toBeDisabled();
  fireEvent.click(pending);
  expect(spy).toHaveBeenCalledTimes(1);
  reject(new Error("Synthetic test failure"));
  await screen.findByText("Could not save request: Synthetic test failure");
});

it("recording a direct-contact study outcome does not submit the request form", async () => {
  await beginStudy("SYNTHETIC-UI-QA", 1, 4, "test-model");
  const writes = vi.spyOn(db, "save");
  start();
  fireEvent.change(await screen.findByLabelText(/Original enquiry/), {
    target: { value: "One guest has a peanut allergy." },
  });
  fireEvent.click(
    screen.getByRole("button", {
      name: "Record direct-contact outcome for study",
    }),
  );
  await screen.findByRole("heading", { name: "Consented local evaluation" });
  const results = await studyResults();
  expect(results).toHaveLength(1);
  expect(results[0].outcome).toBe("manual_contact");
  expect(results[0].criticalCorrect).toBe(true);
  expect(writes).not.toHaveBeenCalled();
});

it("blocks a missing revision instead of opening a fresh request", async () => {
  start("/request/new?mode=form&revise=missing-record");
  await screen.findByText(
    "This record cannot be revised; contact the operator.",
  );
  expect(screen.queryByLabelText("Date")).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: /^Review request/ }),
  ).not.toBeInTheDocument();
  expect(await db.list()).toHaveLength(0);
});
it("blocks preparation when experience preferences cannot be loaded", async () => {
  vi.spyOn(db, "preference").mockRejectedValueOnce(
    new Error("Storage unavailable"),
  );
  start();
  await screen.findByText("Storage unavailable");
  expect(screen.queryByLabelText("Date")).not.toBeInTheDocument();
});

it("a study-recording failure after saving does not offer a duplicate save", async () => {
  vi.spyOn(study, "finishStudy").mockRejectedValueOnce(
    new Error("Study storage failed"),
  );
  vi.spyOn(console, "error").mockImplementation(() => {});
  start();
  await fillCard();
  reviewCard();
  confirmCard();
  fireEvent.click(saveButton());
  await screen.findByRole("heading", { name: "Ready to send" });
  expect(await db.list()).toHaveLength(1);
  expect(screen.queryByText(/Could not save request/)).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Save request on this device" }),
  ).not.toBeInTheDocument();
});

it("changing the request URL starts a clean draft with the requested entry mode", async () => {
  function Navigation() {
    const navigate = useNavigate();
    return (
      <button onClick={() => navigate("/request/new")}>
        Switch request URL
      </button>
    );
  }
  render(
    <MemoryRouter initialEntries={["/request/new?mode=form"]}>
      <Navigation />
      <App />
    </MemoryRouter>,
  );
  await fillCard();
  reviewCard();
  confirmCard();
  fireEvent.click(screen.getByRole("button", { name: "Switch request URL" }));
  await screen.findByRole("heading", { name: "English entry · Experimental" });
  expect(
    screen.queryByRole("heading", { name: "Review your request" }),
  ).not.toBeInTheDocument();
  expect(screen.getByLabelText(/English enquiry/)).toHaveValue("");
  expect(await db.list()).toHaveLength(0);
});
