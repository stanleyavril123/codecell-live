import type * as Monaco from "monaco-editor";
import Editor from "@monaco-editor/react";
import { useRef, useState } from "react";
import { useTheme } from "../theme";
import LanguageSelector from "./LanguageSelector.tsx";
import { Box } from "@mui/material";
import OutputPanel from "./OutputPanel.tsx";
import RunButton from "./RunButton.tsx";
import { LANGUAGE_VERSION, type UiLanguage } from "../constants.ts";
type EditorType = Monaco.editor.IStandaloneCodeEditor;

const CodeEditor = () => {
  const editorRef = useRef<EditorType | null>(null);
  const [language, setLanguage] = useState<UiLanguage>("javascript");
  const { theme } = useTheme();
  const [source, setSource] = useState<string>("");

  const onMount = (editor: EditorType) => {
    editorRef.current = editor;
    editor.focus();
  };

  const onSelect = (language: UiLanguage) => {
    setLanguage(language);
  };

  return (
    <Box className="panel" sx={{ width: "100%" }}>
      <Box className="toolbar">
        <LanguageSelector language={language} onSelect={onSelect} />
        <RunButton language={LANGUAGE_VERSION[language]} source={source} />
        <Box sx={{ flex: 1 }} />
      </Box>

      <Box className="editor-frame">
        <Editor
          height="56vh"
          value={source}
          theme={theme === "dark" ? "vs-dark" : "vs-light"}
          onMount={onMount}
          language={language}
          onChange={(value) => setSource(value ?? "")}
          options={{
            minimap: { enabled: false },
            roundedSelection: false,
            cursorBlinking: "smooth",
            scrollBeyondLastLine: false,
            lineNumbers: "on",
            glyphMargin: false,
            renderLineHighlight: "none",
            fontFamily:
              "'IBM Plex Mono','JetBrains Mono', ui-monospace, Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
            fontSize: 18,
            lineHeight: 28,
            padding: { top: 16, bottom: 16 },
          }}
        />
      </Box>

      <OutputPanel output="I AM CODE" />
    </Box>
  );
};

export default CodeEditor;
