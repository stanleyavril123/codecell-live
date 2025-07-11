import { Box } from "@mui/material";
import ThemeToggle from "./components/ThemeToggle";
import CodeEditor from "./components/CodeEditor";
import RunButton from "./components/RunButton";

function App() {
  return (
    <Box>
      <ThemeToggle />
      <RunButton />
      <CodeEditor />
    </Box>
  );
}
export default App;
