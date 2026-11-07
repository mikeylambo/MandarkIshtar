import { mountBrowserDevConsole } from "@slu/web-shell";
import { App } from "./app/App";

const app = new App();
app.boot().then(() => {
  if (new URLSearchParams(location.search).get("dev") === "1") mountBrowserDevConsole(app.shell.studio.dev, { title: "Mandark Ishtar DEV" });
}).catch((e) => { console.warn("[mandark] boot failed", e); app.fail(e); });
