import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const mainPath = path.join(root, ".storybook", "main.js");
const previewPath = path.join(root, ".storybook", "preview.js");
const storiesDir = path.join(root, "stories");

const requiredFiles = [mainPath, previewPath];
for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    console.error(`Missing Storybook config: ${path.relative(root, file)}`);
    process.exit(1);
  }
}

const mainContents = fs.readFileSync(mainPath, "utf8");
if (!mainContents.includes("@storybook/addon-a11y")) {
  console.error("Storybook accessibility addon is not configured.");
  process.exit(1);
}

const storyFiles = fs
  .readdirSync(storiesDir)
  .filter((file) => file.endsWith(".stories.tsx"))
  .sort();

if (storyFiles.length === 0) {
  console.error("No Storybook stories found.");
  process.exit(1);
}

console.log("Storybook CI validation passed.");
console.log(`Stories: ${storyFiles.join(", ")}`);
