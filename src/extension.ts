import * as vscode from "vscode";
import { graph, setTerraformPath } from "./terraform";
import { TerrastateProvider } from "./terrastateProvider";
import { GraphProvider } from "./graphProvider";

export async function activate(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  context: vscode.ExtensionContext
): Promise<void> {
  if (!(await setTerraformPath())) {
    return;
  }

  const terrastateProvider = new TerrastateProvider();

  vscode.window.registerTreeDataProvider(
    "terrastate.terrastate",
    terrastateProvider
  );

  const graphProvider = new GraphProvider();

  vscode.window.registerTreeDataProvider("terrastate.graph", graphProvider);

  vscode.commands.registerCommand(
    "terrastate.refresh",
    terrastateProvider.refresh.bind(terrastateProvider)
  );

  vscode.commands.registerCommand(
    "terrastate.init",
    terrastateProvider.init.bind(terrastateProvider)
  );

  vscode.commands.registerCommand(
    "terrastate.validate",
    terrastateProvider.validate.bind(terrastateProvider)
  );

  vscode.commands.registerCommand(
    "terrastate.apply",
    terrastateProvider.apply.bind(terrastateProvider)
  );

  vscode.commands.registerCommand(
    "terrastate.applyAll",
    terrastateProvider.apply.bind(terrastateProvider)
  );

  vscode.commands.registerCommand(
    "terrastate.destroy",
    terrastateProvider.destroy.bind(terrastateProvider)
  );

  vscode.commands.registerCommand(
    "terrastate.destroyAll",
    terrastateProvider.destroy.bind(terrastateProvider)
  );

  vscode.commands.registerCommand(
    "terrastate.taint",
    terrastateProvider.taint.bind(terrastateProvider)
  );

  vscode.commands.registerCommand(
    "terrastate.untaint",
    terrastateProvider.untaint.bind(terrastateProvider)
  );

  vscode.commands.registerCommand(
    "terrastate.sync",
    terrastateProvider.sync.bind(terrastateProvider)
  );

  vscode.commands.registerCommand("terrastate.graph", async (arg: string) => {
    const panel = vscode.window.createWebviewPanel(
      "Graph",
      "Terrastate – Graph",
      vscode.ViewColumn.One,
      { enableScripts: true }
    );
    panel.iconPath = vscode.Uri.joinPath(
      context.extensionUri,
      "media/terrastate.png"
    );
    panel.webview.html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
    </head>
      <body>
        <div id="main"></div>
        <script src="https://d3js.org/d3.v5.min.js"></script>
        <script src="https://unpkg.com/@hpcc-js/wasm@0.3.11/dist/index.min.js"></script>
        <script src="https://unpkg.com/d3-graphviz@3.0.5/build/d3-graphviz.js"></script>
        <script>
          const dot = ${JSON.stringify(await graph(arg))}
          d3.select("#main").graphviz().renderDot(dot)
        </script>
      </body>
    </html>
    `;
  });
}
