import * as vscode from "vscode";
import * as path from "path";
import {
  Resource,
  getDeployedResources,
  getResources,
  destroy,
  apply,
} from "./terraform";

const TF_GLOB = "**/{*.tf,terraform.tfstate}";

export class TerrastateItem extends vscode.TreeItem {
  directory: string;
  resource?: Resource;

  constructor({
    type,
    directory,
    resource,
  }: {
    type: string;
    directory: string;
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
      case "dormant-resource":
        this.label = resource?.name;
        this.description = resource?.type;
        this.tooltip = "Not deployed";
        this.iconPath = new vscode.ThemeIcon("symbol-constructor");
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
        this.resources.delete(directory);
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

      if (
        [...directories].every((directory) =>
          this.directories.has(directory)
        ) &&
        [...this.directories].every((directory) => directories.has(directory))
      ) {
        return;
      }

      // Removed directories
      [...this.directories]
        .filter((directory) => !directories.has(directory))
        .map((directory) => {
          this.resources.delete(directory);
        });

      this.directories = directories;
      this._onDidChangeTreeData.fire();
    }, 1000);
  }

  async updateResources(directory: string): Promise<void> {
    try {
      const deployedResources = (await getDeployedResources(directory)).map(
        (resource) =>
          new TerrastateItem({
            type: "resource",
            directory,
            resource,
          })
      );

      const dormantResources = (await getResources(directory))
        .filter((address) =>
          deployedResources.every(
            ({ resource }) => address !== resource?.address
          )
        )
        .map(
          (address) =>
            new TerrastateItem({
              type: "dormant-resource",
              directory,
              resource: {
                address,
                name: address.split(".")[1],
                type: address.split(".")[0],
              },
            })
        );

      this.resources.set(directory, [
        ...deployedResources,
        ...dormantResources,
      ]);

      if (!this.resources.get(directory)?.length) {
        this.resources.set(directory, [
          new TerrastateItem({ type: "none", directory }),
        ]);
      }
    } catch (err) {
      this.resources.set(directory, [
        new TerrastateItem({ type: "error", directory }),
      ]);
    }
  }

  async getChildren(element?: TerrastateItem): Promise<TerrastateItem[]> {
    if (element?.directory) {
      if (this.resources.get(element.directory) === undefined) {
        await this.updateResources(element.directory);
      }
      return this.resources.get(element.directory) ?? [];
    }

    return [...this.directories]
      .sort()
      .map((directory) => new TerrastateItem({ type: "directory", directory }));
  }

  getTreeItem(element: TerrastateItem): vscode.TreeItem {
    return element;
  }

  refresh(item: TerrastateItem): void {}

  async apply(item: TerrastateItem): Promise<void> {
    if (item.contextValue === "directory") {
      (this.resources.get(item.directory) || []).forEach((element) => {
        element.iconPath = new vscode.ThemeIcon(
          "sync~spin",
          new vscode.ThemeColor("debugIcon.startForeground")
        );
      });
      this._onDidChangeTreeData.fire();
      await apply(item.directory);
    } else if (item.contextValue === "dormant-resource") {
      item.iconPath = new vscode.ThemeIcon(
        "sync~spin",
        new vscode.ThemeColor("debugIcon.startForeground")
      );
      this._onDidChangeTreeData.fire();
      await apply(item.directory, item.resource?.address);
    }
  }

  async destroy(item: TerrastateItem): Promise<void> {
    if (item.contextValue === "directory") {
      (this.resources.get(item.directory) || []).forEach((element) => {
        if (element.contextValue === "resource") {
          element.iconPath = new vscode.ThemeIcon(
            "sync~spin",
            new vscode.ThemeColor("list.errorForeground")
          );
        }
      });
      this._onDidChangeTreeData.fire();
      await destroy(item.directory);
    } else if (item.contextValue === "resource") {
      item.iconPath = new vscode.ThemeIcon(
        "sync~spin",
        new vscode.ThemeColor("list.errorForeground")
      );
      this._onDidChangeTreeData.fire();
      await destroy(item.directory, item.resource?.address);
    }
  }

  taint(item: TerrastateItem): void {}

  untaint(item: TerrastateItem): void {}

  async sync(): Promise<void> {
    this.directories = new Set(
      (await vscode.workspace.findFiles(TF_GLOB)).map(({ fsPath }) =>
        path.dirname(fsPath)
      )
    );
    this.resources.clear();
    this._onDidChangeTreeData.fire();
  }
}
