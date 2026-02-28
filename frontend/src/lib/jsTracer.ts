import * as acorn from "acorn";
import { generate } from "astring";

export interface JSTraceStep {
  line_no: number;
  event: string;
  func_name: string;
  callStack: string[];
  locals: Record<string, any>;
  webAPIs: { id: string; name: string }[];
  taskQueue: { id: string; name: string }[];
  microQueue: { id: string; name: string }[];
  stdout: string;
}

export async function traceJavaScript(code: string): Promise<JSTraceStep[]> {
  const trace: JSTraceStep[] = [];
  let callStack: string[] = ["<main>"];
  let webAPIs: { id: string; name: string }[] = [];
  let taskQueue: { id: string; name: string; cb: Function }[] = [];
  let microQueue: { id: string; name: string; cb: Function }[] = [];
  let output = "";

  const recordStep = (lineNum: number, currentFunc?: string) => {
    trace.push({
      line_no: lineNum,
      event: "step",
      func_name: currentFunc || callStack[callStack.length - 1],
      callStack: [...callStack],
      locals: {},
      webAPIs: [...webAPIs],
      taskQueue: [...taskQueue],
      microQueue: [...microQueue],
      stdout: output,
    });
  };

  let ast;
  try {
    ast = acorn.parse(code, { ecmaVersion: 2022, locations: true });

    const walk = (node: any) => {
      if (node && node.body && Array.isArray(node.body)) {
        const newBody: any[] = [];
        for (let stmt of node.body) {
          if (stmt.loc && stmt.type !== "FunctionDeclaration") {
            newBody.push({
              type: "ExpressionStatement",
              expression: {
                type: "CallExpression",
                callee: { type: "Identifier", name: "_STEP_" },
                arguments: [{ type: "Literal", value: stmt.loc.start.line }],
              },
            });
          }
          newBody.push(stmt);
        }
        node.body = newBody;
      }

      for (let key in node) {
        if (node[key] && typeof node[key] === "object") {
          if (Array.isArray(node[key])) {
            node[key].forEach(walk);
          } else {
            walk(node[key]);
          }
        }
      }
    };
    walk(ast);
  } catch (e: any) {
    throw new Error("Syntax error: " + e.message);
  }

  const instrumentedCode = generate(ast);

  const _STEP_ = (line: number) => {
    recordStep(line);
  };

  const mockConsole = {
    log: (...args: any[]) => {
      output += args.map((a) => String(a)).join(" ") + "\n";
    },
  };

  let timerId = 0;
  const mockSetTimeout = (cb: Function, delay: number) => {
    const id = "timer_" + timerId++;
    const apiItem = { id, name: "setTimeout(" + delay + "ms)" };
    webAPIs.push(apiItem);
    recordStep(-1);

    setTimeout(() => {
      webAPIs = webAPIs.filter((a) => a.id !== id);
      taskQueue.push({ id, name: "timer callback", cb });
      recordStep(-1);
    }, 10);

    return id as any;
  };

  const mockPromise = {
    resolve: () => ({
      then: (cb: Function) => {
        const id = "micro_" + timerId++;
        microQueue.push({ id, name: "Promise.then callback", cb });
        recordStep(-1);
        return mockPromise.resolve();
      },
    }),
  };

  try {
    const fn = new Function(
      "_STEP_",
      "console",
      "setTimeout",
      "Promise",
      instrumentedCode,
    );
    fn(_STEP_, mockConsole, mockSetTimeout, mockPromise);
  } catch (e: any) {
    output += "\nException: " + e.message;
  }

  callStack.pop();

  while (taskQueue.length > 0 || microQueue.length > 0) {
    if (microQueue.length > 0) {
      const task = microQueue.shift()!;
      callStack.push(task.name);
      recordStep(-1);
      try {
        task.cb();
      } catch (e) {}
      callStack.pop();
      recordStep(-1);
    } else {
      const task = taskQueue.shift()!;
      callStack.push(task.name);
      recordStep(-1);
      try {
        task.cb();
      } catch (e) {}
      callStack.pop();
      recordStep(-1);
    }
  }

  return new Promise((resolve) => {
    setTimeout(() => {
      while (taskQueue.length > 0 || microQueue.length > 0) {
        if (microQueue.length > 0) {
          const task = microQueue.shift()!;
          callStack.push(task.name);
          recordStep(-1);
          try {
            task.cb();
          } catch (e) {}
          callStack.pop();
          recordStep(-1);
        } else {
          const task = taskQueue.shift()!;
          callStack.push(task.name);
          recordStep(-1);
          try {
            task.cb();
          } catch (e) {}
          callStack.pop();
          recordStep(-1);
        }
      }
      resolve(trace);
    }, 50);
  });
}
