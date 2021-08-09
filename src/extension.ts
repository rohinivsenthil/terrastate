import * as vscode from "vscode";
import { setTerraformPath } from "./terraform";
import { TerrastateProvider } from "./terrastateProvider";

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
}
