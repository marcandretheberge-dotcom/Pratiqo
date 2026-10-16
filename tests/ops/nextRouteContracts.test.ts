import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import { POST as checkout } from "../../app/api/stripe/pro/checkout/route";

function source(path: string) {
  return ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

test("analytics and checkout expose only their Next.js route contract", () => {
  for (const path of ["app/api/analytics/search-event/route.ts", "app/api/stripe/pro/checkout/route.ts"]) {
    const names: string[] = [];
    for (const statement of source(path).statements) {
      if (ts.isExportDeclaration(statement)) assert.fail(`Unexpected re-export in ${path}`);
      if (!ts.canHaveModifiers(statement) || !ts.getModifiers(statement)?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) continue;
      if (ts.isFunctionDeclaration(statement)) names.push(statement.name!.text);
      if (ts.isVariableStatement(statement)) {
        for (const declaration of statement.declarationList.declarations) names.push(declaration.name.getText());
      }
    }
    assert.deepEqual(names.sort(), ["POST", "runtime"]);
  }
});

test("resolution unwraps async route params before using the case identifier", () => {
  const page = source("app/(app)/resolution/[id]/page.tsx");
  const component = page.statements.find(s => ts.isFunctionDeclaration(s) && s.name?.text === "ResolutionCaseDetailPage");
  assert.ok(component && ts.isFunctionDeclaration(component));
  assert.match(component.parameters[0].type!.getText(), /params:\s*Promise<\{ id: string \}>/);
  assert.match(component.body!.getText(), /const \{ id \} = use\(params\)/);
  assert.match(component.body!.getText(), /\.eq\("id", id\)/);
  assert.match(component.body!.getText(), /\[id, user\?\.id\]/);
  assert.doesNotMatch(component.body!.getText(), /params\.id/);
});

test("checkout keeps both consent errors before any authenticated/payment work", async () => {
  const fetch = globalThis.fetch;
  let networkCalls = 0;
  globalThis.fetch = async () => {
    networkCalls++;
    throw new Error("Network is forbidden in this regression test");
  };
  try {
    for (const [body, code] of [
      [{}, "renewal_consent_required"],
      [{ renewalAccepted: false, legalAccepted: true }, "renewal_consent_required"],
      [{ renewalAccepted: "true", legalAccepted: true }, "renewal_consent_required"],
      [{ renewalAccepted: true }, "legal_acceptance_required"],
      [{ renewalAccepted: true, legalAccepted: false }, "legal_acceptance_required"],
    ] as const) {
      const response = await checkout(new Request("https://example.invalid/api/stripe/pro/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }));
      assert.equal(response.status, 400);
      assert.equal((await response.json()).code, code);
    }
    assert.equal(networkCalls, 0);
  } finally {
    globalThis.fetch = fetch;
  }
});
