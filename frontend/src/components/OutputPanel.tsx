import { Box } from "@mui/material";

type Props = {
  output: string;
};

const OutputPanel = ({ output }: Props) => {
  return <Box>{output}</Box>;
};

export default OutputPanel;
