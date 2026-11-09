import "@fontsource/barlow-condensed/latin-600.css";
import "@fontsource/barlow-condensed/latin-700-italic.css";
import "@fontsource/barlow-condensed/latin-800-italic.css";
import "@fontsource/barlow-condensed/latin-900-italic.css";
import "@fontsource/barlow-condensed/latin-600-italic.css";
import "@fontsource/barlow-semi-condensed/latin-500.css";
import "@fontsource/barlow-semi-condensed/latin-500-italic.css";
import "@fontsource/barlow-semi-condensed/latin-600.css";
import { mountBrowserDevConsole } from "@slu/web-shell";
import { App } from "./app/App";

const app = new App();
app.boot().then(() => {
  if (new URLSearchParams(location.search).get("dev") === "1") mountBrowserDevConsole(app.shell.studio.dev, { title: "Mandark Ishtar DEV" });
}).catch((e) => { console.warn("[mandark] boot failed", e); app.fail(e); });
