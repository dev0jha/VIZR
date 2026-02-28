const inspector = require("inspector");
const session = new inspector.Session();
session.connect();

const trace = [];

session.on("Debugger.paused", (message) => {
  const frames = message.params.callFrames;
  if (frames.length > 0) {
    const frame = frames[0];
    // We only care if it's our parsed script
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
  // Add script to run
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

  // To intercept the initial start, we can run it in a VM context if we want, or evaluate it
  session.post("Runtime.evaluate", { expression: code }, () => {
    setTimeout(() => {
      console.log(JSON.stringify(trace, null, 2));
      session.disconnect();
    }, 500);
  });
});
