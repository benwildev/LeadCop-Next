import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ReputationBadge, { getReputationColor, getReputationLabel } from "@/components/ReputationBadge";

describe("getReputationColor", () => {
  it("returns green for scores >= 80", () => {
    expect(getReputationColor(80)).toContain("green");
    expect(getReputationColor(100)).toContain("green");
    expect(getReputationColor(95)).toContain("green");
  });

  it("returns yellow for scores between 50 and 79", () => {
    expect(getReputationColor(50)).toContain("yellow");
    expect(getReputationColor(65)).toContain("yellow");
    expect(getReputationColor(79)).toContain("yellow");
  });

  it("returns red for scores below 50", () => {
    expect(getReputationColor(49)).toContain("red");
    expect(getReputationColor(0)).toContain("red");
    expect(getReputationColor(25)).toContain("red");
  });
});

describe("getReputationLabel", () => {
  it("returns Good for scores >= 80", () => {
    expect(getReputationLabel(80)).toBe("Good");
    expect(getReputationLabel(100)).toBe("Good");
  });

  it("returns Moderate for scores between 50 and 79", () => {
    expect(getReputationLabel(50)).toBe("Moderate");
    expect(getReputationLabel(79)).toBe("Moderate");
  });

  it("returns Poor for scores below 50", () => {
    expect(getReputationLabel(0)).toBe("Poor");
    expect(getReputationLabel(49)).toBe("Poor");
  });
});

describe("ReputationBadge", () => {
  it("renders the score value", () => {
    render(<ReputationBadge score={85} />);
    expect(screen.getByText("85")).toBeTruthy();
  });

  it("applies green color class for high reputation (>= 80)", () => {
    const { container } = render(<ReputationBadge score={90} />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain("green");
  });

  it("applies yellow color class for moderate reputation (50-79)", () => {
    const { container } = render(<ReputationBadge score={60} />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain("yellow");
  });

  it("applies red color class for low reputation (< 50)", () => {
    const { container } = render(<ReputationBadge score={30} />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain("red");
  });

  it("renders with accessible aria-label", () => {
    render(<ReputationBadge score={75} />);
    const badge = screen.getByLabelText(/reputation score: 75/i);
    expect(badge).toBeTruthy();
  });

  it("renders the boundary score 80 as green", () => {
    const { container } = render(<ReputationBadge score={80} />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain("green");
  });

  it("renders the boundary score 50 as yellow", () => {
    const { container } = render(<ReputationBadge score={50} />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain("yellow");
  });
});
