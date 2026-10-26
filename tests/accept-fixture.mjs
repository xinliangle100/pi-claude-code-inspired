// Shared acceptance checks for the disposable fixture in docs/evaluation.md.
// Import only fixture source you trust: importing executes that module.
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
if (process.argv.length !== 3) {
  console.error("Usage: node tests/accept-fixture.mjs /path/to/fixture/src/export-service.js");
  process.exit(2);
}
const { exportRows } = await import(pathToFileURL(resolve(process.argv[2])).href);
const cases = [
  [[], ""],
  [[["A", "B"], ["C", "D"]], "A,B\nC,D"],
  [[["a,b", 'a"b', "a\nb", "a\rb"]], '"a,b","a""b","a\nb","a\rb"'],
  [[[""]], ""],
  [[["", null, undefined, 0, false]], ",,,0,false"],
  [[["  a ", "中文"]], "  a ,中文"],
  [[[], []], "\n"],
  [[["A", ""]], "A,"],
  [[["a\r\nb"]], '"a\r\nb"'],
];
for (const [input, expected] of cases) assert.equal(exportRows("csv", input), expected);
assert.equal(exportRows("plain", [["a,b", 'a"b']]), 'a,b | a"b');
assert.throws(() => exportRows("other", []), { message: "Unknown format: other" });
assert.throws(() => exportRows("csv", null), { name: "TypeError", message: "rows must be an array" });
console.log("12/12 shared acceptance checks passed");
