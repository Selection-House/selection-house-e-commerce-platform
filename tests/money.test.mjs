import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

// Load the small pure TypeScript module without a test-runner or runtime dependency.
const source = await readFile(new URL("../src/lib/money.ts", import.meta.url), "utf8");
const javascript = source.replaceAll(/:\s*(?:number\s*\|\s*string|number|string)(?=\s*[,)])/g, "")
  .replace("export function", "function").replaceAll("export function", "function");
const testModule = { exports: {} };
vm.runInNewContext(`${javascript}\nmodule.exports = { priceWithTax, toPaise, fromPaise, lineTotalPaise };`, { module: testModule, Intl, Number, Math, Error });
const { priceWithTax, toPaise, fromPaise, lineTotalPaise } = testModule.exports;

test("GST is extracted in integer paise from an inclusive price", () => {
  assert.deepEqual({ ...priceWithTax(120, 18) }, { total: 120, tax: 18.31, totalPaise: 12000, taxPaise: 1831 });
  assert.equal(priceWithTax(0.05, 5).taxPaise, 0);
});

test("line totals multiply integer paise without decimal drift", () => {
  assert.equal(lineTotalPaise("19.99", 3), 5997);
  assert.equal(fromPaise(lineTotalPaise(19.99, 3)), 59.97);
});

test("money conversion rejects invalid amounts and unsafe quantities", () => {
  assert.throws(() => toPaise("NaN"), /INVALID_MONEY_AMOUNT/);
  assert.throws(() => fromPaise(-1), /INVALID_MONEY_AMOUNT/);
  assert.throws(() => lineTotalPaise(5, 1.5), /INVALID_QUANTITY/);
});
