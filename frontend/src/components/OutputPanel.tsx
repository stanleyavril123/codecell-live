import { Box } from "@mui/material";

type Props = { title?: string; output: string };

const OutputPanel = ({ title = "stdout", output }: Props) => {
  return (
    <>
      <Box className="output-header">
        <span style={{ fontWeight: 700, letterSpacing: ".02em" }}>{title}</span>
      </Box>
      <Box className="output-body">{output || " "}</Box>
    </>
  );
};

export default OutputPanel;
