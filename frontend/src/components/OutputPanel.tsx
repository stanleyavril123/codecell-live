import { Box } from "@mui/material";
import { useTheme } from "../theme";
type Props = {
  output: string;
};

const OutputPanel = ({ output }: Props) => {
  const { theme } = useTheme();
  return (
    <Box
      className="output-frame"
      sx={{
        background: theme === "dark" ? "#1a1a1a" : "#ffffff",
        borderRadius: 0,
        padding: "1rem",
        fontFamily: "ui-monospace, Menlo, Monaco, monospace",
        fontSize: "0.95rem",
        color: "#333",
        minHeight: "3rem",
        whiteSpace: "pre-wrap",
      }}
    >
      {output}
    </Box>
  );
};

export default OutputPanel;
