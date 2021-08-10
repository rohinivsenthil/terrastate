/* eslint-disable no-empty */
import * as vscode from "vscode";
import * as path from "path";
import { TF_GLOB, GRAPH } from "./constants";

export class GraphProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | void> =
    new vscode.EventEmitter<vscode.TreeItem | void>();
  readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | void | null> =
    this._onDidChangeTreeData.event;

  private directories: Set<string> = new Set<string>();

  constructor() {
    setInterval(async () => {
      if (await this.updateDirectories()) {
        this._onDidChangeTreeData.fire();
      }
    }, 1000);
  }

  private async updateDirectories(): Promise<boolean> {
    const directories = new Set(
      (await vscode.workspace.findFiles(TF_GLOB)).map(({ fsPath }) =>
        path.dirname(fsPath)
      )
    );

    if (
      [...directories].every((directory) => this.directories.has(directory)) &&
      [...this.directories].every((directory) => directories.has(directory))
    ) {
      return false;
    }

    this.directories = directories;

    return true;
  }

  async getChildren(): Promise<vscode.TreeItem[]> {
    return [...this.directories].sort().map((directory) => {
      const item = new vscode.TreeItem(
        path.dirname(
          vscode.workspace.asRelativePath(
            path.join(directory || "", "tmp"),
            true
          )
        ),
        vscode.TreeItemCollapsibleState.None
      );
      item.iconPath = GRAPH;
      item.command = {
        command: "terrastate.graph",
        title: 'Terraform Graph',
        tooltip: "Terraform Graph",
        arguments: [directory],
      };
      return item;
    });
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }
}
