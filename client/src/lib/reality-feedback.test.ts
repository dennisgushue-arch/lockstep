import test from "node:test";
import assert from "node:assert/strict";
import { buildRealityFeedback } from "./reality-feedback";

type TestCommitment = {
  status: "scheduled" | "completed" | "missed";
  scheduledDate: string;
  intent?: {
    parsed_intent?: {
      category?: string;
    };
  };
};

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function makeCommitment(overrides: Partial<TestCommitment> = {}): TestCommitment {
  return {
    status: "scheduled",
    scheduledDate: daysAgo(0),
    ...overrides,
  };
}

test("returns warning copy when there are no commitments", () => {
  const feedback = buildRealityFeedback([]);

  assert.equal(feedback.severity, "warning");
  assert.equal(feedback.headline, "Nothing proven yet.");
  assert.match(feedback.truth, /not created a pact/i);
});

test("returns open outcome warning for scheduled-only state", () => {
  const feedback = buildRealityFeedback([
    makeCommitment({ status: "scheduled", scheduledDate: daysAgo(0) }),
  ]);

  assert.equal(feedback.severity, "warning");
  assert.equal(feedback.headline, "The outcome is still open.");
  assert.match(feedback.nextMove, /final hour/i);
});

test("returns critical when misses outnumber completions", () => {
  const feedback = buildRealityFeedback([
    makeCommitment({
      status: "missed",
      scheduledDate: daysAgo(1),
      intent: { parsed_intent: { category: "fitness" } },
    }),
    makeCommitment({
      status: "missed",
      scheduledDate: daysAgo(2),
      intent: { parsed_intent: { category: "fitness" } },
    }),
    makeCommitment({
      status: "completed",
      scheduledDate: daysAgo(1),
      intent: { parsed_intent: { category: "work" } },
    }),
  ]);

  assert.equal(feedback.severity, "critical");
  assert.equal(feedback.headline, "Momentum is slipping.");
  assert.match(feedback.truth, /1\/3 pacts this week/);
  assert.match(feedback.pattern, /fitness/i);
});

test("returns warning when completion rate is below 70%", () => {
  const feedback = buildRealityFeedback([
    makeCommitment({
      status: "completed",
      scheduledDate: daysAgo(0),
      intent: { parsed_intent: { category: "work" } },
    }),
    makeCommitment({
      status: "completed",
      scheduledDate: daysAgo(1),
      intent: { parsed_intent: { category: "work" } },
    }),
    makeCommitment({
      status: "missed",
      scheduledDate: daysAgo(2),
      intent: { parsed_intent: { category: "work" } },
    }),
    makeCommitment({
      status: "missed",
      scheduledDate: daysAgo(3),
      intent: { parsed_intent: { category: "social" } },
    }),
  ]);

  assert.equal(feedback.severity, "warning");
  assert.equal(feedback.headline, "You are inconsistent.");
  assert.match(feedback.truth, /50%/);
});

test("returns good when completion rate is 70% or higher", () => {
  const feedback = buildRealityFeedback([
    makeCommitment({ status: "completed", scheduledDate: daysAgo(1) }),
    makeCommitment({ status: "completed", scheduledDate: daysAgo(2) }),
    makeCommitment({ status: "completed", scheduledDate: daysAgo(3) }),
    makeCommitment({ status: "missed", scheduledDate: daysAgo(4) }),
  ]);

  assert.equal(feedback.severity, "good");
  assert.equal(feedback.headline, "Momentum is holding.");
  assert.match(feedback.truth, /3\/4 pacts this week/);
});

test("ignores resolved commitments older than 7 days", () => {
  const feedback = buildRealityFeedback([
    makeCommitment({ status: "completed", scheduledDate: daysAgo(10) }),
    makeCommitment({ status: "missed", scheduledDate: daysAgo(11) }),
  ]);

  assert.equal(feedback.severity, "warning");
  assert.equal(feedback.headline, "You are inconsistent.");
  assert.match(feedback.truth, /0%/);
});
