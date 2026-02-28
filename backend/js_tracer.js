const acorn = require("acorn");
const walk = require("acorn-walk");
const escodegen = require("escodegen");

function instrumentCode(code) {
  const ast = acorn.parse(code, { ecmaVersion: 2022, locations: true });

  // We modify the AST to insert _TRACE_(lineNum) before each statement
  // For simplicity, we create a function that rewrites BlockStatement and Program body

  function injectTrace(node) {
    if (node && node.body && Array.isArray(node.body)) {
      const newBody = [];
      for (let i = 0; i < node.body.length; i++) {
        const stmt = node.body[i];
        if (stmt.loc && stmt.loc.start) {
          const line = stmt.loc.start.line;
          // Create ExpressionStatement: _TRACE_(line)
          const traceNode = {
            type: "ExpressionStatement",
            expression: {
              type: "CallExpression",
              callee: { type: "Identifier", name: "_TRACE_" },
              arguments: [{ type: "Literal", value: line }],
              optional: false,
            },
          };
          newBody.push(traceNode);
        }
        newBody.push(stmt);
      }
      node.body = newBody;
    }
  }

  walk.simple(ast, {
    Program: injectTrace,
    BlockStatement: injectTrace,
  });

  return escodegen.generate(ast);
}

const inputCode =
  process.argv[2] ||
  `
console.log("start");
setTimeout(() => {
    console.log("timeout");
}, 0);
Promise.resolve().then(() => {
    console.log("promise");
});
console.log("end");
`;

try {
  const instrumented = instrumentCode(inputCode);
  console.log("--- INSTRUMENTED CODE ---");
  console.log(instrumented);
} catch (e) {
  console.error(e);
}
