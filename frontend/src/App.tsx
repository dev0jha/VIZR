import { useState, useEffect, useRef } from "react";
import { CodeEditor } from "./components/CodeEditor";
import { Visualizer, type VisualizerState } from "./components/Visualizer";
import { Play, Pause, ChevronLeft, ChevronRight, Terminal } from "lucide-react";
import "./index.css";

const DEFAULT_PYTHON = `def fib(n):
    if n <= 1:
        return n
    return fib(n-1) + fib(n-2)

print(fib(4))
`;

const DEFAULT_JS = `console.log("Start");

setTimeout(() => {
  console.log("Timeout 1");
}, 0);

Promise.resolve().then(() => {
  console.log("Promise 1");
});

console.log("End");
`;

function App() {
  const [language, setLanguage] = useState<"python" | "javascript">("python");
  const [code, setCode] = useState(DEFAULT_PYTHON);

  const [trace, setTrace] = useState<any[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const playInterval = useRef<number | ReturnType<typeof setInterval> | null>(
    null,
  );

  const [visState, setVisState] = useState<VisualizerState>({
    callStack: [],
    locals: {},
    webAPIs: [],
    taskQueue: [],
    microQueue: [],
    stdout: "",
  });

  const [activeLine, setActiveLine] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (trace.length === 0) return;

    let currentStack: string[] = [];
    const currentStep = trace[stepIndex];

    if (language === "python") {
      for (let i = 0; i <= stepIndex; i++) {
        const step = trace[i];
        if (step.event === "call") currentStack.push(step.func_name);
        else if (step.event === "return") currentStack.pop();
      }
      if (currentStack.length === 0) currentStack = ["<module>"];

      setVisState({
        callStack: currentStack,
        locals: currentStep.locals || {},
        webAPIs: [],
        taskQueue: [],
        microQueue: [],
        stdout: currentStep.stdout || "",
      });
      setActiveLine(currentStep.line_no);
    } else {
      setVisState({
        callStack: currentStep.callStack || [],
        locals: currentStep.locals || {},
        webAPIs: currentStep.webAPIs || [],
        taskQueue: currentStep.taskQueue || [],
        microQueue: currentStep.microQueue || [],
        stdout: currentStep.stdout || "",
      });
      setActiveLine(currentStep.line_no > 0 ? currentStep.line_no : undefined);
    }
  }, [stepIndex, trace, language]);

  const switchLanguage = (lang: "python" | "javascript") => {
    setLanguage(lang);
    setCode(lang === "python" ? DEFAULT_PYTHON : DEFAULT_JS);
    setTrace([]);
    setStepIndex(0);
    setError(null);
  };

  const handleRun = async () => {
    setIsPlaying(false);
    setTrace([]);
    setStepIndex(0);
    setError(null);

    try {
      if (language === "python") {
        const resp = await fetch("http://localhost:8000/api/trace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, language }),
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.detail || "Execution failed");
        if (data.error) setError(data.error);
        setTrace(data.steps || []);
      } else {
        const { traceJavaScript } = await import("./lib/jsTracer");
        const jsTrace = await traceJavaScript(code);
        setTrace(jsTrace);
      }
      setStepIndex(0);
    } catch (e: any) {
      setError(e.toString());
    }
  };

  const nextStep = () => {
    if (stepIndex < trace.length - 1) setStepIndex((s) => s + 1);
    else setIsPlaying(false);
  };

  const prevStep = () => {
    if (stepIndex > 0) setStepIndex((s) => s - 1);
  };

  useEffect(() => {
    if (isPlaying) {
      playInterval.current = setInterval(() => {
        setStepIndex((s) => {
          if (s >= trace.length - 1) {
            setIsPlaying(false);
            return s;
          }
          return s + 1;
        });
      }, 400);
    } else {
      if (playInterval.current) clearInterval(playInterval.current);
    }
    return () => {
      if (playInterval.current) clearInterval(playInterval.current);
    };
  }, [isPlaying, trace.length]);

  return (
    <div className="app">
      {/* ── Header ──────────────────────────── */}
      <header className="header">
        <div className="logo">
          <span>{">"}</span> vizr
        </div>

        <div className="header-actions">
          <div className="lang-toggle">
            <button
              className={`lang-btn ${language === "python" ? "active" : ""}`}
              onClick={() => switchLanguage("python")}
            >
              Python
            </button>
            <button
              className={`lang-btn ${language === "javascript" ? "active" : ""}`}
              onClick={() => switchLanguage("javascript")}
            >
              JavaScript
            </button>
          </div>

          <button className="run-btn" onClick={handleRun}>
            <Terminal size={13} /> Run
          </button>
        </div>
      </header>

      {/* ── Main ────────────────────────────── */}
      <main className="main">
        <div className="editor-section">
          <CodeEditor
            code={code}
            language={language}
            onChange={(v) => setCode(v || "")}
            activeLine={activeLine}
          />
          {error && <div className="error-bar">{error}</div>}
        </div>

        <Visualizer state={visState} />
      </main>

      {/* ── Footer ──────────────────────────── */}
      <footer className="footer">
        <button
          className="ctrl-btn"
          onClick={prevStep}
          disabled={trace.length === 0 || stepIndex === 0}
        >
          <ChevronLeft size={14} /> Prev
        </button>

        <button
          className="ctrl-btn"
          onClick={() => setIsPlaying(!isPlaying)}
          disabled={trace.length === 0 || stepIndex === trace.length - 1}
        >
          {isPlaying ? (
            <>
              <Pause size={13} /> Pause
            </>
          ) : (
            <>
              <Play size={13} /> Play
            </>
          )}
        </button>

        <button
          className="ctrl-btn"
          onClick={nextStep}
          disabled={trace.length === 0 || stepIndex === trace.length - 1}
        >
          Next <ChevronRight size={14} />
        </button>

        <span className="step-info">
          {trace.length > 0 ? `${stepIndex + 1} / ${trace.length}` : "—"}
        </span>
      </footer>
    </div>
  );
}

export default App;
