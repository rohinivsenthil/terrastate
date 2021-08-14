import * as vscode from "vscode";
import * as path from "path";

const TERRAFORM_VERISON_RANGE = ">=0.12.0";

const DIRECTORY = path.join(__filename, "../../media/folder-terraform.svg");

const TAINTED = new vscode.ThemeIcon(
  "debug-alt",
  new vscode.ThemeColor("debugIcon.startForeground")
);
const DEPLOYED = new vscode.ThemeIcon("debug-start");
const DORMANT = new vscode.ThemeIcon("symbol-constructor");
const MODULE = new vscode.ThemeIcon(
  "symbol-constructor",
  new vscode.ThemeColor("terminal.ansiBrightBlue")
);
const LOADER = new vscode.ThemeIcon("sync~spin");
const GRAPH = new vscode.ThemeIcon("type-hierarchy");

const TF_GLOB = "**/{*.tf,terraform.tfstate}";

export {
  TERRAFORM_VERISON_RANGE,
  DIRECTORY,
  TAINTED,
  DEPLOYED,
  DORMANT,
  MODULE,
  LOADER,
  GRAPH,
  TF_GLOB,
};
