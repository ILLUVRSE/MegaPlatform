import axe from "axe-core";
import { render, type RenderResult } from "@testing-library/react";
import type * as React from "react";

export async function renderAndExpectAccessible(node: React.ReactElement): Promise<RenderResult> {
  const view = render(node);
  const results = await axe.run(view.container, {
    rules: {
      region: { enabled: false },
      "color-contrast": { enabled: false }
    }
  });

  expect(results.violations).toEqual([]);
  return view;
}
