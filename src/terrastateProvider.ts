import * as vscode from "vscode";
import * as path from "path";
import { Resource, getDeployedResources } from "./terraform";

const TF_GLOB = "**/{*.tf,terraform.tfstate}";

export class TerrastateItem extends vscode.TreeItem {
  directory?: string;
  resource?: Resource;

  constructor({
    type,
    directory,
    resource,
  }: {
    type: string;
    directory?: string;
    resource?: Resource;
  }) {
    super(
      "",
      type === "directory"
        ? vscode.TreeItemCollapsibleState.Expanded
        : vscode.TreeItemCollapsibleState.None
    );

    switch (type) {
      case "directory":
        this.label = path.dirname(
          vscode.workspace.asRelativePath(
            path.join(directory || "", "tmp"),
            true
          )
        );
        this.iconPath = path.join(
          __filename,
          "../../media/folder-terraform.svg"
        );
        break;
      case "resource":
        this.label = resource?.name;
        this.description = resource?.type;
        this.tooltip = resource?.tainted ? "Tainted" : "Deployed";
        this.iconPath = resource?.tainted
          ? new vscode.ThemeIcon(
              "debug-alt",
              new vscode.ThemeColor("list.warningForeground")
            )
          : new vscode.ThemeIcon("debug-start");
        break;
      case "none":
        this.description = "(No resources deployed)";
        break;
      case "error":
        this.description = "(Failed to load resources)";
        break;
      default:
        throw new Error(`Invalid type ${type}`);
    }

    this.contextValue = type;
    this.directory = directory;
    this.resource = resource;
  }
}

export class TerrastateProvider
  implements vscode.TreeDataProvider<TerrastateItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<TerrastateItem | void> =
    new vscode.EventEmitter<TerrastateItem | void>();
  readonly onDidChangeTreeData: vscode.Event<TerrastateItem | void | null> =
    this._onDidChangeTreeData.event;

  private directories: Set<string> = new Set<string>();
  private resources: Map<string, TerrastateItem[]> = new Map<
    string,
    TerrastateItem[]
  >();

  constructor() {
    const watcher = vscode.workspace.createFileSystemWatcher(
      TF_GLOB,
      false,
      false,
      false
    );

    const updateDir = (directory: string) => {
      if (this.directories.has(directory)) {
        this.updateResources(directory);
        this._onDidChangeTreeData.fire();
      }
    };

    watcher.onDidCreate(({ fsPath }) => updateDir(path.dirname(fsPath)));
    watcher.onDidChange(({ fsPath }) => updateDir(path.dirname(fsPath)));
    watcher.onDidDelete(({ fsPath }) => updateDir(path.dirname(fsPath)));

    setInterval(async () => {
      const directories = new Set(
        (await vscode.workspace.findFiles(TF_GLOB)).map(({ fsPath }) =>
          path.dirname(fsPath)
        )
      );

      // Removed directories
      [...this.directories]
        .filter((directory) => !directories.has(directory))
        .map((directory) => {
          this.resources.delete(directory);
        });

      // Added directories
      await Promise.all(
        [...directories]
          .filter((directory) => !this.directories.has(directory))
          .map((directory) => this.updateResources(directory))
      );

      this.directories = directories;
      this._onDidChangeTreeData.fire();
    }, 1000);
  }

  async updateResources(directory: string): Promise<void> {
    try {
      this.resources.set(
        directory,
        (await getDeployedResources(directory)).map(
          (resource) =>
            new TerrastateItem({
              type: "resource",
              resource,
            })
        )
      );
    } catch (err) {
      this.resources.set(directory, [new TerrastateItem({ type: "error" })]);
    }
  }

  getChildren(element?: TerrastateItem): TerrastateItem[] {
    if (element?.directory) {
      const resources = this.resources.get(element.directory);
      if (resources === undefined || resources.length === 0) {
        return [new TerrastateItem({ type: "none" })];
      } else {
        return resources;
      }
    }

    return [...this.directories]
      .sort()
      .map((directory) => new TerrastateItem({ type: "directory", directory }));
  }

  getTreeItem(element: TerrastateItem): vscode.TreeItem {
    return element;
  }

  refresh(item: TerrastateItem): void {}

  apply(item: TerrastateItem): void {}

  destroy(item: TerrastateItem): void {
    if (item.contextValue === "directory") {
      console.log("terraform destroy");
    } else if (item.contextValue === "resource") {
      console.log(
        `terraform destroy -target=${item.resource?.type}.${item.resource?.name}`
      );
    }
  }

  taint(item: TerrastateItem): void {}

  untaint(item: TerrastateItem): void {}

  async sync(): Promise<void> {
    const directories = new Set(
      (await vscode.workspace.findFiles(TF_GLOB)).map(({ fsPath }) =>
        path.dirname(fsPath)
      )
    );

    // Removed directories
    [...this.directories]
      .filter((directory) => !directories.has(directory))
      .map((directory) => {
        this.resources.delete(directory);
      });

    await Promise.all(
      [...directories].map((directory) => this.updateResources(directory))
    );

    this.directories = directories;
    this._onDidChangeTreeData.fire();
  }
}
