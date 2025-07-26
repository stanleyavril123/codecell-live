import { Box } from "@mui/material";
import { useTheme } from "../theme";

type Props = { output: string };

const OutputPanel = ({ output }: Props) => {
  const { theme } = useTheme();
  return (
    <Box
      className="output-frame"
      sx={{
        background:
          theme === "dark" ? "#1a1a1a" : "var(--page)" /* = #efeee7 */,
        padding: "0.9rem 1rem",
        fontFamily: "IBM Plex Mono, ui-monospace, Menlo, Monaco, monospace",
        fontSize: "0.95rem",
        color: theme === "dark" ? "#e6e6e6" : "#222",
        minHeight: "3rem",
        whiteSpace: "pre-wrap",
      }}
    >
      {output}
    </Box>
  );
};

export default OutputPanel;
