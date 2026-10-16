import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Card } from "@/components/ui/card";

const classesOf = (label: string) => screen.getByLabelText(label).className.split(" ");

describe("Card", () => {
  it("uses the surface and the soft border by default", () => {
    render(<Card aria-label="c">x</Card>);

    expect(classesOf("c")).toEqual(expect.arrayContaining(["bg-surface", "border-border"]));
  });

  // Regression: overriding colors through className made two bg/border classes compete.
  it.each([
    ["success", "bg-primary-soft", "border-success-border"],
    ["danger", "bg-danger-soft", "border-danger-border"],
    ["warning", "bg-warning-soft", "border-warning-border"],
  ] as const)("tone %s sets exactly one background and one border color", (tone, bg, border) => {
    render(
      <Card aria-label="c" tone={tone}>
        x
      </Card>,
    );
    const classes = classesOf("c");

    expect(classes).toEqual(expect.arrayContaining([bg, border]));
    expect(classes.filter((c) => c.startsWith("bg-"))).toEqual([bg]);
    expect(classes.filter((c) => /^border-(?!\d)/.test(c))).toEqual([border]);
  });
});
