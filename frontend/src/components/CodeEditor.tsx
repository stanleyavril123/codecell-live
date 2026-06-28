import type * as MonacoNS from "monaco-editor";
import Editor from "@monaco-editor/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Button } from "@mui/material";
import LanguageSelector from "./LanguageSelector";
import OutputPanel from "./OutputPanel";
import RunButton from "./RunButton";
import { LANGUAGE_VERSION, type UiLanguage } from "../constants";
import { ChunkSchema, type OutputChunk } from "../../../shared/chunks";
import { trpc } from "../trpc";
import {
  MonacoPresence,
  type CollabRuntime,
} from "../collab/MonacoPresence";
import { getCollabIdentity } from "../collab/identity";

type EditorType = MonacoNS.editor.IStandaloneCodeEditor;
const UI_LANGUAGES = Object.keys(LANGUAGE_VERSION) as UiLanguage[];

function isUiLanguage(value: unknown): value is UiLanguage {
  return typeof value === "string" && UI_LANGUAGES.includes(value as UiLanguage);
}

const CodeEditor = () => {
  const editorRef = useRef<EditorType | null>(null);
  const jobStreamRef = useRef<WebSocket | null>(null);
  const collab = useMemo(() => getCollabIdentity(), []);

  const [language, setLanguage] = useState<UiLanguage>("javascript");
  const [source, setSource] = useState<string>("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [output, setOutput] = useState<string>("");
  const [collabEditor, setCollabEditor] = useState<EditorType | null>(null);
  const [collabRuntime, setCollabRuntime] = useState<CollabRuntime | null>(
    null,
  );
  const [runStatus, setRunStatus] = useState<string>("idle");

  const runState = collabRuntime?.runState ?? null;
  const settingsState = collabRuntime?.settingsState ?? null;

  const closeJobStream = useCallback(() => {
    jobStreamRef.current?.close();
    jobStreamRef.current = null;
  }, []);

  const setSharedRunValue = useCallback(
    (key: string, value: unknown) => {
      runState?.set(key, value);
    },
    [runState],
  );

  const appendChunk = useCallback(
    (chunk: OutputChunk) => {
      if (!runState) return;

      const previous = String(runState.get("output") ?? "");
      switch (chunk.type) {
        case "stdout":
          runState.set("output", previous + chunk.data);
          break;
        case "stderr":
          runState.set("output", previous + "\n" + chunk.data);
          break;
        case "exit":
          runState.set("output", previous + `\nexit ${chunk.data}`);
          runState.set("status", "finished");
          closeJobStream();
          break;
      }
      runState.set("updatedAt", Date.now());
    },
    [closeJobStream, runState],
  );

  const attachJobStream = useCallback(
    (id: string) => {
      closeJobStream();
      const ws = new WebSocket(`ws://localhost:4000/stream?jobId=${id}`);
      jobStreamRef.current = ws;

      ws.onerror = () => {
        setSharedRunValue("status", "error");
        setSharedRunValue("output", "Error: lost connection to job output.");
      };

      ws.onmessage = (event) => {
        let json: unknown;
        try {
          json = JSON.parse(String(event.data));
        } catch {
          return;
        }

        const parsed = ChunkSchema.safeParse(json);
        if (parsed.success) {
          appendChunk(parsed.data);
        }
      };

      ws.onclose = () => {
        if (jobStreamRef.current === ws) {
          jobStreamRef.current = null;
        }
      };
    },
    [appendChunk, closeJobStream, setSharedRunValue],
  );

  const { mutate: runCode, isPending } = trpc.runCode.useMutation({
    onSuccess({ jobId: nextJobId }, variables) {
      runState?.set("jobId", nextJobId);
      runState?.set("output", "");
      runState?.set("status", "running");
      runState?.set("runnerId", collab.userId);
      runState?.set("language", variables.language);
      runState?.set("source", variables.source);
      runState?.set("updatedAt", Date.now());
      attachJobStream(nextJobId);
    },
    onError(error) {
      runState?.set("jobId", null);
      runState?.set("output", `Error: ${error.message}`);
      runState?.set("status", "error");
      runState?.set("updatedAt", Date.now());
    },
  });

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
    setCollabEditor(editor);
    editor.focus();
  };

  const handleRun = () => {
    const sourceToRun = editorRef.current?.getValue() ?? source;
    runState?.set("output", "");
    runState?.set("status", "starting");
    runState?.set("runnerId", collab.userId);
    runState?.set("updatedAt", Date.now());
    closeJobStream();
    runCode({
      language: LANGUAGE_VERSION[language],
      source: sourceToRun,
    });
  };

  const handleLanguageSelect = (nextLanguage: UiLanguage) => {
    setLanguage(nextLanguage);
    settingsState?.set("language", nextLanguage);
    settingsState?.set("updatedAt", Date.now());
  };

  const clearOutput = () => {
    runState?.set("output", "");
    runState?.set("status", "idle");
    runState?.set("jobId", null);
    runState?.set("updatedAt", Date.now());
    closeJobStream();
  };

  useEffect(() => {
    if (!runState) {
      setJobId(null);
      setOutput("");
      setRunStatus("idle");
      return;
    }

    const syncRunState = () => {
      const nextJobId = runState.get("jobId");
      const nextOutput = runState.get("output");
      const nextStatus = runState.get("status");

      setJobId(typeof nextJobId === "string" ? nextJobId : null);
      setOutput(typeof nextOutput === "string" ? nextOutput : "");
      setRunStatus(typeof nextStatus === "string" ? nextStatus : "idle");
    };

    syncRunState();
    runState.observe(syncRunState);

    return () => {
      runState.unobserve(syncRunState);
    };
  }, [runState]);

  useEffect(() => {
    if (!settingsState) return;

    if (!isUiLanguage(settingsState.get("language"))) {
      settingsState.set("language", language);
      settingsState.set("updatedAt", Date.now());
    }

    const syncSettingsState = () => {
      const nextLanguage = settingsState.get("language");
      if (isUiLanguage(nextLanguage)) {
        setLanguage(nextLanguage);
      }
    };

    syncSettingsState();
    settingsState.observe(syncSettingsState);

    return () => {
      settingsState.unobserve(syncSettingsState);
    };
  }, [language, settingsState]);

  useEffect(() => closeJobStream, [closeJobStream]);

  return (
    <Box className="panel">
      <Box className="toolbar">
        <LanguageSelector language={language} onSelect={handleLanguageSelect} />
        <RunButton
          disabled={isPending || !runState}
          isRunning={isPending || runStatus === "running"}
          onRun={handleRun}
        />
        <Button size="small" className="btn-stop" disabled>
          Stop
        </Button>
        <Button
          size="small"
          className="btn-clear"
          onClick={clearOutput}
        >
          Clear
        </Button>{" "}
        <Box sx={{ flex: 1 }} />{" "}
        <div className="live" title={`room: ${collab.padId}`}>
          <span className="dot" style={{ background: collab.color }} />{" "}
          {collab.name}{" "}
          <span style={{ opacity: 0.65 }}>room:</span> {collab.padId}
        </div>
        {jobId && (
          <div className="live" title={`job: ${jobId}`}>
            {" "}
            <span className="dot" /> LIVE{" "}
            <span style={{ opacity: 0.65 }}>job:</span> {jobId.slice(0, 8)}{" "}
          </div>
        )}{" "}
      </Box>{" "}
      <Box className="editor-frame">
        {" "}
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
        />{" "}
        {collabEditor && (
          <MonacoPresence
            padId={collab.padId}
            editor={collabEditor}
            me={{
              userId: collab.userId,
              name: collab.name,
              color: collab.color,
            }}
            wsUrl={collab.wsUrl}
            onReady={setCollabRuntime}
          />
        )}
      </Box>{" "}
      <OutputPanel title="stdout" output={output} />{" "}
    </Box>
  );
};
export default CodeEditor;
