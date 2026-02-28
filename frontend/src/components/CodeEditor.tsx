import Editor from "@monaco-editor/react";

interface CodeEditorProps {
  code: string;
  language: string;
  onChange: (value: string | undefined) => void;
  activeLine?: number;
}

export function CodeEditor({
  code,
  language,
  onChange,
  activeLine,
}: CodeEditorProps) {
  const handleEditorDidMount = (_editor: any, monaco: any) => {
    monaco.editor.defineTheme("vizDark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "555555", fontStyle: "italic" },
        { token: "keyword", foreground: "c8ff00" },
        { token: "string", foreground: "a78bfa" },
        { token: "number", foreground: "4488ff" },
      ],
      colors: {
        "editor.background": "#121212",
        "editor.foreground": "#d4d4d4",
        "editorLineNumber.foreground": "#333333",
        "editorLineNumber.activeForeground": "#666666",
        "editor.lineHighlightBackground": "#1a1a1a",
        "editor.selectionBackground": "#c8ff0020",
        "editorCursor.foreground": "#c8ff00",
      },
    });
    monaco.editor.setTheme("vizDark");

    if (activeLine && activeLine > 0) {
      _editor.deltaDecorations(
        [],
        [
          {
            range: new monaco.Range(activeLine, 1, activeLine, 1),
            options: {
              isWholeLine: true,
              className: "active-line-decoration",
              linesDecorationsClassName: "active-line-gutter",
            },
          },
        ],
      );
    }
  };

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <Editor
        height="100%"
        language={language}
        value={code}
        onChange={onChange}
        theme="vizDark"
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          fontFamily: "'Geist Mono', 'SF Mono', 'Fira Code', monospace",
          fontLigatures: true,
          lineHeight: 22,
          padding: { top: 16, bottom: 16 },
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          cursorBlinking: "phase",
          cursorSmoothCaretAnimation: "on",
          renderLineHighlight: "gutter",
          guides: { indentation: false },
          overviewRulerBorder: false,
          scrollbar: {
            verticalScrollbarSize: 4,
            horizontalScrollbarSize: 4,
          },
        }}
      />
    </div>
  );
}
