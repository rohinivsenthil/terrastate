import * as vscode from "vscode";
import { TerrastateProvider } from "./terrastateProvider";

export async function activate(
  context: vscode.ExtensionContext
): Promise<void> {
  const terrastateProvider = new TerrastateProvider();
  vscode.window.registerTreeDataProvider(
    "terrastate.terrastate",
    terrastateProvider
  );

  vscode.commands.registerCommand("terrastate.refresh", () =>
    terrastateProvider.refresh()
  );
  vscode.commands.registerCommand("terrastate.apply", () =>
    terrastateProvider.refresh()
  );
}
