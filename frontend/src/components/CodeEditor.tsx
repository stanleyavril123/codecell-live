import type * as Monaco from "monaco-editor";
import Editor from "@monaco-editor/react";
import { useRef, useState } from "react";
import { useTheme } from "../theme";
import LanguageSelector from "./LanguageSelector.tsx";
import { Box } from "@mui/material";
type EditorType = Monaco.editor.IStandaloneCodeEditor;

const CodeEditor = () => {
  const editorRef = useRef<EditorType | null>(null);
  const [language, setLanguage] = useState<string>("javascript");
  const { theme } = useTheme();

  const onMount = (editor: EditorType) => {
    editorRef.current = editor;
    editor.focus();
  };

  const onSelect = (language: string) => {
    setLanguage(language);
  };
  return (
    <Box>
      <LanguageSelector language={language} onSelect={onSelect} />
      <Editor
        height="90vh"
        value=""
        theme={theme === "dark" ? "vs-dark" : "vs-light"}
        onMount={onMount}
        language={language}
      />
    </Box>
  );
};

export default CodeEditor;
