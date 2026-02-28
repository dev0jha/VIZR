import { motion, AnimatePresence } from "framer-motion";

export interface VisualizerState {
  callStack: string[];
  locals: Record<string, any>;
  webAPIs: { id: string; name: string }[];
  taskQueue: { id: string; name: string }[];
  microQueue: { id: string; name: string }[];
  stdout: string;
}

interface VisualizerProps {
  state: VisualizerState;
}

const spring = { type: "spring", stiffness: 500, damping: 30 };

export function Visualizer({ state }: VisualizerProps) {
  return (
    <div className="viz-grid">
      <div className="viz-cell">
        <div className="viz-label">
          <span className="dot dot-blue" /> Call Stack
        </div>
        <div className="viz-body">
          <AnimatePresence mode="popLayout">
            {state.callStack.map((frame, i) => (
              <motion.div
                key={`${frame}-${i}`}
                className="frame"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={spring}
                layout
              >
                {frame}()
              </motion.div>
            ))}
          </AnimatePresence>
          {state.callStack.length === 0 && (
            <div className="empty-state">empty</div>
          )}
        </div>
      </div>

      <div className="viz-cell">
        <div className="viz-label">
          <span className="dot dot-accent" /> Scope
        </div>
        <div className="viz-body">
          <AnimatePresence>
            {Object.entries(state.locals).map(([key, value]) => (
              <motion.div
                key={key}
                className="var-row"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <span className="var-name">{key}</span>
                <span className="var-value">{String(value)}</span>
              </motion.div>
            ))}
          </AnimatePresence>
          {Object.keys(state.locals).length === 0 && (
            <div className="empty-state">no variables</div>
          )}
        </div>
      </div>

      <div className="viz-cell">
        <div className="viz-label">
          <span className="dot dot-accent" /> Web APIs
        </div>
        <div className="viz-body">
          <AnimatePresence>
            {state.webAPIs.map((api) => (
              <motion.div
                key={api.id}
                className="q-item q-api"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.12 }}
              >
                {api.name}
              </motion.div>
            ))}
          </AnimatePresence>
          {state.webAPIs.length === 0 && (
            <div className="empty-state">idle</div>
          )}
        </div>

        <div className="console-section">
          <div className="viz-label" style={{ marginBottom: 6 }}>
            Output
          </div>
          <pre className="console-output">
            {state.stdout || <span className="empty-state">—</span>}
          </pre>
        </div>
      </div>

      <div className="viz-cell">
        <div className="viz-label">
          <span className="dot dot-purple" /> Event Loop
        </div>
        <div className="viz-body">
          <div className="queue-sublabel">Microtasks</div>
          <AnimatePresence>
            {state.microQueue.map((item, i) => (
              <motion.div
                key={item.id + i}
                className="q-item q-micro"
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 6 }}
                transition={{ duration: 0.12 }}
              >
                {item.name}
              </motion.div>
            ))}
          </AnimatePresence>
          {state.microQueue.length === 0 && (
            <div className="empty-state">empty</div>
          )}

          <div className="queue-sublabel">Macrotasks</div>
          <AnimatePresence>
            {state.taskQueue.map((item, i) => (
              <motion.div
                key={item.id + i}
                className="q-item q-macro"
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 6 }}
                transition={{ duration: 0.12 }}
              >
                {item.name}
              </motion.div>
            ))}
          </AnimatePresence>
          {state.taskQueue.length === 0 && (
            <div className="empty-state">empty</div>
          )}
        </div>
      </div>
    </div>
  );
}
