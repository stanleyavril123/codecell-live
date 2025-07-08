import { useTheme } from "../theme";

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <button onClick={toggleTheme}>{theme === "dark" ? "Night" : "Day"}</button>
  );
};

export default ThemeToggle;
