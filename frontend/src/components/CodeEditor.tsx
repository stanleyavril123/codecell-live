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
    <Box>
      <Box sx={{ margin: "10px" }}>
        <LanguageSelector language={language} onSelect={onSelect} />
        <RunButton language={LANGUAGE_VERSION[language]} source={source} />
        <Editor
          height="50vh"
          value={source}
          theme={theme === "dark" ? "vs-dark" : "vs-light"}
          onMount={onMount}
          language={language}
          onChange={(value) => setSource(value ?? "")}
        />
      </Box>
      <OutputPanel />
    </Box>
  );
};

export default CodeEditor;
