import { Box } from "@mui/material";
import ThemeToggle from "./components/ThemeToggle";
import CodeEditor from "./components/CodeEditor";
import RunButton from "./components/RunButton";
import LanguageSelector from "./components/LanguageSelector";

function App() {
  return (
    <Box>
      <ThemeToggle />
      <RunButton />
      <LanguageSelector />
      <CodeEditor />
    </Box>
  );
}
export default App;
