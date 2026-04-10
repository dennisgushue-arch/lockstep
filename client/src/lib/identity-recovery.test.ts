import { getRecoveryPlan } from "./identity-recovery";

describe("getRecoveryPlan", () => {
  it("returns rebuild plan for critical", () => {
    const plan = getRecoveryPlan(20);
    expect(plan.mode).toBe("rebuild");
    expect(plan.headline).toMatch(/Recovery Required/);
    expect(plan.instruction).toMatch(/clean win/i);
    expect(plan.nextAction).toMatch(/2–3 hours/);
    expect(plan.deadlineHint).toBe("Same-day only");
    expect(plan.reason).toMatch(/rebuild trust/i);
  });

  it("returns stabilize plan for fragile", () => {
    const plan = getRecoveryPlan(40);
    expect(plan.mode).toBe("stabilize");
    expect(plan.headline).toMatch(/Stabilize/);
    expect(plan.instruction).toMatch(/not take on anything large/i);
    expect(plan.nextAction).toMatch(/today/);
    expect(plan.deadlineHint).toBe("Today");
    expect(plan.reason).toMatch(/consistency/i);
  });

  it("returns none for stable/solid", () => {
    const plan = getRecoveryPlan(75);
    expect(plan.mode).toBe("none");
    expect(plan.headline).toBe("");
  });
});
