import sys
import copy
import traceback
import io
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any, Optional

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CodeRequest(BaseModel):
    code: str
    language: str

class ExecStep(BaseModel):
    line_no: int
    event: str
    func_name: str
    locals: Dict[str, Any]
    stdout: str
    stderr: str

class TraceResult(BaseModel):
    steps: List[ExecStep]
    error: Optional[str] = None
    output: str

def safe_repr(obj, max_len=100):
    try:
        r = repr(obj)
        if len(r) > max_len:
            r = r[:max_len] + "..."
        return r
    except Exception:
        return "<unrepresentable>"

def clean_locals(local_dict):
    cleaned = {}
    for k, v in local_dict.items():
        if not k.startswith("__"):
            # Avoid huge objects and functions
            if callable(v) or type(v).__name__ == "module":
                continue
            # Try to serialize simply
            if isinstance(v, (int, float, str, bool, type(None))):
                cleaned[k] = v
            elif isinstance(v, (list, tuple, set, dict)):
                cleaned[k] = safe_repr(v)
            else:
                cleaned[k] = f"<{type(v).__name__}>"
    return cleaned

def run_python_trace(code: str) -> TraceResult:
    steps = []
    output_capture = io.StringIO()
    error_capture = io.StringIO()

    original_stdout = sys.stdout
    original_stderr = sys.stderr
    
    sys.stdout = output_capture
    sys.stderr = error_capture

    def trace_calls(frame, event, arg):
        if frame.f_code.co_filename != "<string>":
            return trace_calls
        
        # Capture current stdout if any
        current_out = output_capture.getvalue()
        current_err = error_capture.getvalue()

        step = ExecStep(
            line_no=frame.f_lineno,
            event=event,
            func_name=frame.f_code.co_name,
            locals=clean_locals(frame.f_locals),
            stdout=current_out,
            stderr=current_err
        )
        steps.append(step)
        
        # Stop tracing if we've recorded too many steps to prevent infinite loops
        if len(steps) > 5000:
            raise RuntimeError("Execution Trace Limit Exceeded (5000 steps)")

        return trace_calls

    error_msg = None
    try:
        # We execute in an isolated dictionary
        env = {}
        
        sys.settrace(trace_calls)
        exec(code, env)
        sys.settrace(None)
    except Exception as e:
        sys.settrace(None)
        error_msg = "".join(traceback.format_exception_only(type(e), e))
    finally:
        sys.stdout = original_stdout
        sys.stderr = original_stderr

    # Fallback to get final outputs
    final_out = output_capture.getvalue()
    
    return TraceResult(
        steps=steps,
        error=error_msg,
        output=final_out
    )

@app.post("/api/trace")
async def trace_code(request: CodeRequest):
    if request.language.lower() == "python":
        result = run_python_trace(request.code)
        return result
    else:
     
        raise HTTPException(status_code=400, detail="Language not fully supported here yet. JS is run in browser.")
