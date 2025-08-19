import { useThemeStore } from '@/stores/themeStore';
import { Button } from './Button';
import {
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
} from '@heroicons/react/24/outline';

export function ThemeToggle(): React.JSX.Element {
  const { theme, resolvedTheme, setTheme } = useThemeStore();

  const handleThemeChange = (): void => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  const getIcon = (): React.JSX.Element => {
    if (theme === 'system') {
      return <ComputerDesktopIcon className="h-4 w-4" />;
    }
    return resolvedTheme === 'light' ? (
      <SunIcon className="h-4 w-4" />
    ) : (
      <MoonIcon className="h-4 w-4" />
    );
  };

  const getLabel = (): string => {
    if (theme === 'system') {
      return `System (${resolvedTheme})`;
    }
    return theme === 'light' ? 'Light' : 'Dark';
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleThemeChange}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'} theme`}
      title={`Current theme: ${getLabel()}`}
    >
      {getIcon()}
      <span className="ml-2 hidden sm:inline">{getLabel()}</span>
    </Button>
  );
}
