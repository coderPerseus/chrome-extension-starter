import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, ConfigProvider, Switch, theme } from "antd";
import { getOrpc } from "@/shared/orpc/query";
import logoUrl from "@/assets/logo.png";

const formatError = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return String(error);
};

function App() {
  const orpc = getOrpc();
  const queryClient = useQueryClient();
  const counterQuery = useQuery(orpc.counter.get.queryOptions());
  const [isDark, setIsDark] = useState(false);
  const incrementMutation = useMutation(
    orpc.counter.increment.mutationOptions({
      onSuccess: (value) => {
        queryClient.setQueryData(orpc.counter.get.queryKey(), value);
      },
    }),
  );
  const counterError = counterQuery.isError
    ? formatError(counterQuery.error)
    : null;
  const appName = useMemo(() => {
    const globals = globalThis as typeof globalThis & {
      browser?: { i18n?: { getMessage?: (key: string) => string } };
      chrome?: { i18n?: { getMessage?: (key: string) => string } };
    };
    const browserMessage = globals.browser?.i18n?.getMessage?.("appName") ?? "";
    const chromeMessage = globals.chrome?.i18n?.getMessage?.("appName") ?? "";
    return browserMessage || chromeMessage || "chrome-extension-starter";
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
  }, [isDark]);

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: isDark ? "#5eead4" : "#0f766e",
          colorText: isDark ? "#e2e8f0" : "#0b0f1a",
          colorTextSecondary: isDark ? "#94a3b8" : "#475569",
          borderRadiusLG: 18,
          fontFamily:
            '"SF Pro Text", "SF Pro Display", "Avenir Next", "Avenir", "Trebuchet MS", sans-serif',
        },
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
      }}
    >
      <div className="popup-shell">
        <header className="popup-header">
          <div className="brand">
            <img src={logoUrl} alt="Logo" className="brand-icon" />
          </div>
          <div className="theme-switch">
            <span>{isDark ? "Dark" : "Light"}</span>
            <Switch
              checked={isDark}
              onChange={(checked) => setIsDark(checked)}
              size="small"
            />
          </div>
        </header>

        <main className="counter-card">
          <div className="counter-header">
            <span className="eyebrow">Counter</span>
            <span className="status-pill">
              <span className="status-dot" /> Live
            </span>
          </div>
          <div className="counter-value">
            {counterError ? "--" : (counterQuery.data ?? "...")}
          </div>
          {counterError ? (
            <p className="error-text">加载失败: {counterError}</p>
          ) : null}
          <Button
            type="primary"
            size="large"
            className="primary-btn"
            loading={incrementMutation.isPending}
            onClick={() => incrementMutation.mutate(undefined)}
          >
            Increment
          </Button>
          {incrementMutation.isError ? (
            <p className="error-text">
              Increment failed: {formatError(incrementMutation.error)}
            </p>
          ) : null}
        </main>

        <footer className="popup-footer">
          <span>如果觉得好用，欢迎给我</span>
          <a
            className="footer-link"
            href="https://github.com/coderPerseus/chrome-extension-starter"
            target="_blank"
            rel="noreferrer"
          >
            Star on GitHub
          </a>
        </footer>
      </div>
    </ConfigProvider>
  );
}

export default App;
