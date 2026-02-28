from main import run_python_trace

code = """
def fact(n):
    if n == 0:
        return 1
    return n * fact(n-1)

print(fact(3))
"""

result = run_python_trace(code)

print("Error:", result.error)
print("Output:", result.output)
for step in result.steps:
    print(f"Line {step.line_no}: event={step.event}, func={step.func_name}, locals={step.locals}, stdout={repr(step.stdout)}")
