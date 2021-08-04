import * as vscode from "vscode";
import { TerrastateProvider } from "./terrastateProvider";

export async function activate(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  context: vscode.ExtensionContext
): Promise<void> {
  const terrastateProvider = new TerrastateProvider();
  vscode.window.registerTreeDataProvider(
    "terrastate.terrastate",
    terrastateProvider
  );
  vscode.commands.registerCommand('terrastate.refresh', () =>
	terrastateProvider.refresh()
  );
	vscode.commands.registerCommand('terrastate.apply', () =>
	terrastateProvider.apply()
  );
	vscode.commands.registerCommand('terrastate.destroy', () =>
	terrastateProvider.detsroy()
  );
	vscode.commands.registerCommand('terrastate.taint', () =>
	terrastateProvider.taint()
  );
	vscode.commands.registerCommand('terrastate.untaint', () =>
	terrastateProvider.untaint()
  );
	vscode.commands.registerCommand('terrastate.sync', () =>
	terrastateProvider.sync()
  );
}
