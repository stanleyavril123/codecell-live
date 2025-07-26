import { useTheme } from "../theme";
import { Button } from "@mui/material";

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <Button sx={{ color: "#000" }} onClick={toggleTheme}>
      {theme === "dark" ? "Night" : "Day"}
    </Button>
  );
};

export default ThemeToggle;
