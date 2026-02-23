/**
 * Wrapper script for running UI tests via xcodebuild.
 *
 * Usage:
 *   deno task test:ui                           # run all UI tests
 *   deno task test:ui EventTests/testAllKeys    # run a single test
 *   deno task test:ui EventTests                # run a test class
 */

import { parseArgs } from "https://deno.land/std/cli/parse_args.ts";

const args = parseArgs(Deno.args, {
  boolean: ["update"],
  default: { update: false },
});

const fixturesDir = "tests/fixtures";
const projectSpec = "tests/fixtures/project.yml";
const projectFile = "tests/fixtures/SkiaWindowTests.xcodeproj";

const filter = args._.length > 0 ? String(args._[0]) : null;

const containerSnapDir =
  "~/Library/Containers/com.skiawindow.testapp.uitests.xctrunner/Data/tmp/skiawindow_snapshots";

function runCommand(
  command: string,
  args: string[],
  cwd?: string,
): Promise<Deno.CommandOutput> {
  return new Deno.Command(command, {
    args,
    cwd,
    stdout: "inherit",
    stderr: "inherit",
  }).output();
}

async function ensureXcodeProject(): Promise<void> {
  try {
    await Deno.stat(projectSpec);
  } catch {
    console.error(`UI test project spec not found: ${projectSpec}`);
    Deno.exit(1);
  }

  let generateResult: Deno.CommandOutput;
  try {
    console.log(`Generating XCTest project from ${projectSpec}...`);
    generateResult = await runCommand("xcodegen", ["generate"], fixturesDir);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      console.error(
        "xcodegen is required for UI tests. Install with: brew install xcodegen",
      );
      Deno.exit(1);
    }
    throw error;
  }

  if (generateResult.code !== 0) {
    console.error("Failed to generate XCTest project via xcodegen.");
    Deno.exit(generateResult.code);
  }

  try {
    await Deno.stat(projectFile);
  } catch {
    console.error(`xcodegen succeeded but project is missing: ${projectFile}`);
    Deno.exit(1);
  }
}

await ensureXcodeProject();
await runCommand("bash", ["-c", `rm -rf ${containerSnapDir}`]);

const xcodebuildArgs = [
  "test",
  "-project", "tests/fixtures/SkiaWindowTests.xcodeproj",
  "-scheme", "TestAppUITests",
  "-destination", "platform=macOS",
];

if (filter) {
  const testId = filter.includes("/")
    ? `TestAppUITests/${filter}`
    : `TestAppUITests/${filter}`;
  xcodebuildArgs.push(`-only-testing:${testId}`);
}

if (args.update) {
  Deno.env.set("TEST_RUNNER_SNAPSHOT_UPDATE", "1");
}

const xcodebuild = new Deno.Command("xcodebuild", {
  args: xcodebuildArgs,
  stdout: "inherit",
  stderr: "inherit",
});
const result = await xcodebuild.output();

const copyArgs = ["run", "--allow-read", "--allow-write", "--allow-env",
  "tests/scripts/copy_snapshots.ts"];
if (args.update) {
  copyArgs.push("--update");
}
const copy = new Deno.Command("deno", {
  args: copyArgs,
  stdout: "inherit",
  stderr: "inherit",
});
await copy.output();

Deno.exit(result.code);
