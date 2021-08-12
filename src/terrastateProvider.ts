/* eslint-disable no-empty */
import * as vscode from "vscode";
import * as path from "path";
import {
  Resource,
  getDeployedResources,
  getResources,
  destroy,
  apply,
  taint,
  untaint,
  refresh,
  init,
  validate,
} from "./terraform";
import {
  TAINTED,
  DEPLOYED,
  DORMANT,
  LOADER,
  TF_GLOB,
  DIRECTORY,
} from "./constants";

type ItemType =
  | "directory"
  | "deployed-resource"
  | "dormant-resource"
  | "no-resources"
  | "error";

class TerrastateItem extends vscode.TreeItem {
  directory: string;
  resource?: Resource;
  type: ItemType;

  constructor({
    type,
    directory,
    resource,
  }: {
    type: ItemType;
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
        this.tooltip = directory;
        this.iconPath = DIRECTORY;
        break;
      case "deployed-resource":
        this.label = resource?.name;
        this.description = resource?.type;
        this.tooltip = `Deployed${resource?.tainted ? " • Tainted" : ""}`;
        this.iconPath = resource?.tainted ? TAINTED : DEPLOYED;
        break;
      case "dormant-resource":
        this.label = resource?.name;
        this.description = resource?.type;
        this.tooltip = "Not deployed";
        this.iconPath = DORMANT;
        break;
      case "no-resources":
        this.description = "(No resources found)";
        break;
      case "error":
        this.description = "(Failed to load resources)";
        break;
    }

    this.type = type;
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
  private busy: Map<string, boolean> = new Map<string, boolean>();
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

    const handleChange = ({ fsPath }: vscode.Uri) => {
      const directory = path.dirname(fsPath);
      if (this.directories.has(directory) && !this.busy.get(directory)) {
        this.resources.delete(directory);
        this._onDidChangeTreeData.fire();
      }
    };

    watcher.onDidChange(handleChange);
    watcher.onDidCreate(handleChange);
    watcher.onDidDelete(handleChange);

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

    // Removed directories
    [...this.directories]
      .filter((directory) => !directories.has(directory))
      .map((directory) => {
        this.resources.delete(directory);
      });

    this.directories = directories;

    return true;
  }

  private async updateResources(directory: string): Promise<void> {
    try {
      const deployedResources = (await getDeployedResources(directory)).map(
        (resource) =>
          new TerrastateItem({
            type: "deployed-resource",
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
          new TerrastateItem({ type: "no-resources", directory }),
        ]);
      }
    } catch (err) {
      this.resources.set(directory, [
        new TerrastateItem({ type: "error", directory }),
      ]);
    }
  }

  private setBusy(item: TerrastateItem, type?: ItemType): void {
    this.busy.set(item.directory, true);
    this.resources.get(item.directory)?.forEach((element) => {
      if (
        (!item.resource?.address ||
          item.resource?.address === element.resource?.address) &&
        (!type || element.type === type)
      ) {
        element.iconPath = LOADER;
      }
    });
    this._onDidChangeTreeData.fire();
  }

  private setIdle(item: TerrastateItem): void {
    this.busy.delete(item.directory);
    this.resources.delete(item.directory);
    this._onDidChangeTreeData.fire();
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

  async refresh(item: TerrastateItem): Promise<void> {
    try {
      this.setBusy(item);
      await refresh(item.directory);
    } catch {
    } finally {
      this.setIdle(item);
    }
  }

  async init(item: TerrastateItem): Promise<void> {
    try {
      this.setBusy(item);
      await init(item.directory);
      vscode.window.showInformationMessage(
        `Successfully initialized ${item.directory}`
      );
    } catch {
    } finally {
      this.setIdle(item);
    }
  }

  async validate(item: TerrastateItem): Promise<void> {
    try {
      this.setBusy(item);
      await validate(item.directory);
      vscode.window.showInformationMessage(
        `Successfully validated ${item.directory}`
      );
    } catch {
    } finally {
      this.setIdle(item);
    }
  }

  async apply(item: TerrastateItem): Promise<void> {
    try {
      this.setBusy(item);
      await apply(item.directory, item.resource?.address);
    } catch {
    } finally {
      this.setIdle(item);
    }
  }

  async destroy(item: TerrastateItem): Promise<void> {
    try {
      this.setBusy(item, "deployed-resource");
      await destroy(item.directory, item.resource?.address);
    } catch {
    } finally {
      this.setIdle(item);
    }
  }

  async taint(item: TerrastateItem): Promise<void> {
    try {
      this.setBusy(item);
      await taint(item.directory, item.resource?.address || "");
    } catch {
    } finally {
      this.setIdle(item);
    }
  }

  async untaint(item: TerrastateItem): Promise<void> {
    try {
      this.setBusy(item);
      await untaint(item.directory, item.resource?.address || "");
    } catch {
    } finally {
      this.setIdle(item);
    }
  }

  async sync(): Promise<void> {
    await this.updateDirectories();
    [...this.resources.keys()].forEach((directory) => {
      if (!this.directories.has(directory) || !this.busy.get(directory)) {
        this.resources.delete(directory);
      }
    });
    this._onDidChangeTreeData.fire();
  }
}
