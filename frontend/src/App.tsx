import { Box, Typography } from "@mui/material";
import CodeEditor from "./components/CodeEditor";

function App() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        width: "100vw",
        background: "inherit",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "2rem 0",
      }}
    >
      <Box sx={{ width: "100%" }}>
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
        </Box>

        <Typography
          component="h1"
          sx={{
            margin: "0 0 1.25rem 9rem",
            fontWeight: 700,
            fontSize: "60px",
            letterSpacing: "0.2px",
            color: "#fff",
          }}
        >
          CodeCell
        </Typography>

        <CodeEditor />
      </Box>
    </Box>
  );
}

export default App;
