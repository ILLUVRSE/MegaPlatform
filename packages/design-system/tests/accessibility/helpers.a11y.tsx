import axe from "axe-core";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ThemeProvider } from "../../src/tokens";

export async function expectAccessible(node: React.ReactElement) {
  document.body.innerHTML = renderToStaticMarkup(<ThemeProvider>{node}</ThemeProvider>);
  const results = await axe.run(document.body, {
    rules: {
      region: { enabled: false }
    }
  });

  expect(results.violations).toEqual([]);
}
