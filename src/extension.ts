import * as vscode from "vscode";
import { setTerraformPath } from "./terraform";
import { TerrastateItem, TerrastateProvider } from "./terrastateProvider";

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
    (item: TerrastateItem) => terrastateProvider.refresh(item)
  );

  vscode.commands.registerCommand(
    "terrastate.init",
    (item: TerrastateItem) => terrastateProvider.init(item)
  );

  vscode.commands.registerCommand(
    "terrastate.validate",
    (item: TerrastateItem) => terrastateProvider.validate(item)
  );

  vscode.commands.registerCommand(
    "terrastate.apply",
    async (item: TerrastateItem) => await terrastateProvider.apply(item)
  );

  vscode.commands.registerCommand(
    "terrastate.applyAll",
    async (item: TerrastateItem) => await terrastateProvider.apply(item)
  );

  vscode.commands.registerCommand(
    "terrastate.destroy",
    async (item: TerrastateItem) => await terrastateProvider.destroy(item)
  );

  vscode.commands.registerCommand(
    "terrastate.destroyAll",
    async (item: TerrastateItem) => await terrastateProvider.destroy(item)
  );

  vscode.commands.registerCommand("terrastate.taint", (item: TerrastateItem) =>
    terrastateProvider.taint(item)
  );

  vscode.commands.registerCommand(
    "terrastate.untaint",
    (item: TerrastateItem) => terrastateProvider.untaint(item)
  );

  vscode.commands.registerCommand("terrastate.sync", () =>
    terrastateProvider.sync()
  );
}
