// First: the Trusted Types policy must exist before any script URL is used.
import "./platform/trusted-types.ts";
import { render } from "preact";
import { App } from "./app/App.tsx";
import { startFileRelay } from "./app/file-relay.ts";
import { startInstallPrompt, startServiceWorker } from "./app/pwa.ts";
import { startRouter } from "./app/router.ts";
import { startTheme } from "./app/theme.ts";
import "./styles/app.css";

startTheme();
startRouter();
startFileRelay();
startInstallPrompt();
render(<App />, document.getElementById("app")!);
startServiceWorker();
