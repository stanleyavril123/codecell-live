import type * as MonacoNS from "monaco-editor";
import Editor from "@monaco-editor/react";
import { useRef, useState } from "react";
import { Box, Button } from "@mui/material";
import LanguageSelector from "./LanguageSelector";
import OutputPanel from "./OutputPanel";
import RunButton from "./RunButton";
import { LANGUAGE_VERSION, type UiLanguage } from "../constants";

type EditorType = MonacoNS.editor.IStandaloneCodeEditor;

const CodeEditor = () => {
  const editorRef = useRef<EditorType | null>(null);

  const [language, setLanguage] = useState<UiLanguage>("javascript");
  const [source, setSource] = useState<string>("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [output, setOutput] = useState<string>("");

  const beforeMount = (monaco: typeof MonacoNS) => {
    monaco.editor.defineTheme("codecell-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "", foreground: "E6EDF3" },
        { token: "comment", foreground: "7D8590" },
        { token: "string", foreground: "A5D6FF" },
        { token: "number", foreground: "F2CC60" },
        { token: "keyword", foreground: "79C0FF" },
        { token: "type", foreground: "B6E3FF" },
      ],
      colors: {
        "editor.background": "#0f161c",
        "editor.foreground": "#e6edf3",
        "editorLineNumber.foreground": "#63717f",
        "editorLineNumber.activeForeground": "#aab8c6",
        "editor.selectionBackground": "#1f6feb33",
        "editor.inactiveSelectionBackground": "#1f6feb22",
        "editorCursor.foreground": "#e6edf3",
        "editorIndentGuide.activeBackground": "#2b3642",
        "editorGutter.background": "#0f161c",
      },
    });
  };

  const onMount = (editor: EditorType) => {
    editorRef.current = editor;
    editor.focus();
  };

  const handleStarted = (id: string) => {
    setJobId(id);
    setOutput("");
    const ws = new WebSocket(`ws://localhost:4000/stream?jobId=${id}`);

    ws.onopen = () => {
      console.log(`WS open for job : ${id}`);
    };

    ws.onclose = () => {
      console.log(`WS closed for job: ${id}`);

      ws.onerror = () => {
        console.log(`WS error for job : ${id}`);
      };
    };
    ws.onmessage = (e) => {
      try {
        const chunk = JSON.parse(e.data as string) as
          | { type: "stdout"; data: string }
          | { type: "stderr"; data: string }
          | { type: "exit"; data: number };

        if (chunk.type === "stdout") setOutput((o) => o + chunk.data);
        if (chunk.type === "stderr") setOutput((o) => o + "\n" + chunk.data);
        if (chunk.type === "exit")
          setOutput((o) => o + `\nexit ${chunk.data}\n`);
      } catch {}
    };
  };

  return (
    <Box className="panel">
      <Box className="toolbar">
        <LanguageSelector language={language} onSelect={setLanguage} />

        <RunButton
          language={LANGUAGE_VERSION[language]}
          source={source}
          onStarted={handleStarted}
        />

        <Button size="small" className="btn-stop" disabled>
          Stop
        </Button>
        <Button
          size="small"
          className="btn-clear"
          onClick={() => setOutput("")}
        >
          Clear
        </Button>

        <Box sx={{ flex: 1 }} />
        {jobId && (
          <div className="live" title={`job: ${jobId}`}>
            <span className="dot" /> LIVE{" "}
            <span style={{ opacity: 0.65 }}>job:</span> {jobId.slice(0, 8)}
          </div>
        )}
      </Box>

      <Box className="editor-frame">
        <Editor
          height="52vh"
          value={source}
          beforeMount={beforeMount}
          theme={"codecell-dark"}
          onMount={onMount}
          language={language}
          onChange={(value) => setSource(value ?? "")}
          options={{
            minimap: { enabled: false },
            roundedSelection: false,
            cursorBlinking: "smooth",
            scrollBeyondLastLine: false,
            renderLineHighlight: "none",
            fontFamily:
              "'IBM Plex Mono','JetBrains Mono', ui-monospace, Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
            fontSize: 16,
            lineHeight: 24,
            padding: { top: 14, bottom: 14 },
          }}
        />
      </Box>

      <OutputPanel title="stdout" output={output} />
    </Box>
  );
};

export default CodeEditor;
