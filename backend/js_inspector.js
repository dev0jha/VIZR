const inspector = require("inspector");

const session = new inspector.Session();
session.connect();

const trace = [];

session.on("Debugger.paused", (message) => {
  const callFrames = message.params.callFrames;
  const frame = callFrames[0];
  const url = frame.url;

  // We only care about our executed script
  if (url.includes("evalmachine")) {
    const line = frame.location.lineNumber + 1; // 0-indexed
    const funcName = frame.functionName || "main";
    const stack = callFrames.map((f) => f.functionName || "main");

    trace.push({ line, funcName, stack });
  }

  session.post("Debugger.stepInto");
});

session.post("Debugger.enable", () => {
  const vm = require("vm");
  const code = `debugger;\nconsole.log("start");\nsetTimeout(() => console.log("timeout"), 0);\nPromise.resolve().then(() => console.log("promise"));\nconsole.log("end");`;

  try {
    vm.runInNewContext(
      code,
      { console: console, setTimeout: setTimeout, Promise: Promise },
      { filename: "evalmachine" },
    );
  } catch (e) {
    console.error(e);
  }

  // allow microtasks and timeouts to finish
  setTimeout(() => {
    console.log("TRACE RESULT:", JSON.stringify(trace, null, 2));
    session.disconnect();
  }, 100); // Hacky delay to wait for traces
});
