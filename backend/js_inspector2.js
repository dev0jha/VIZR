const inspector = require("inspector");
const session = new inspector.Session();
session.connect();

const trace = [];

session.on("Debugger.paused", (message) => {
  const frames = message.params.callFrames;
  if (frames.length > 0) {
    const frame = frames[0];

    if (frame.url && frame.url !== "" && !frame.url.startsWith("node:")) {
      trace.push({
        line: frame.location.lineNumber + 1,
        func: frame.functionName || "main",
        stack: frames.map((f) => f.functionName || "main"),
      });
    }
  }
  session.post("Debugger.stepInto");
});

session.post("Debugger.enable", () => {
  const code = `
function hello() {
    console.log("hello");
}
hello();
setTimeout(() => {
    console.log("timeout");
}, 0);
Promise.resolve().then(() => console.log("promise"));
`;

  session.post("Runtime.evaluate", { expression: code }, () => {
    setTimeout(() => {
      console.log(JSON.stringify(trace, null, 2));
      session.disconnect();
    }, 500);
  });
});
