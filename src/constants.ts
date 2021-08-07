import * as vscode from "vscode";
import * as path from "path";

const DIRECTORY = path.join(__filename, "../../media/folder-terraform.svg");

const TAINTED = new vscode.ThemeIcon(
  "debug-alt",
  new vscode.ThemeColor("list.warningForeground")
);

const DEPLOYED = new vscode.ThemeIcon("debug-start");

const DORMANT = new vscode.ThemeIcon("symbol-constructor");

const APPLY_LOADER = new vscode.ThemeIcon(
  "sync~spin",
  new vscode.ThemeColor("debugIcon.startForeground")
);

const DESTROY_LOADER = new vscode.ThemeIcon(
  "sync~spin",
  new vscode.ThemeColor("list.errorForeground")
);

const TF_GLOB = "**/{*.tf,terraform.tfstate}";

export {
  DIRECTORY,
  TAINTED,
  DEPLOYED,
  DORMANT,
  APPLY_LOADER,
  DESTROY_LOADER,
  TF_GLOB,
};
