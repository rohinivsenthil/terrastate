import * as vscode from "vscode";
import * as path from "path";
import { promises as fsPromises } from "fs";

const TF_GLOB = "**/{*.tf,terraform.tfstate}";

type Resource = {
  name: string;
  type: string;
  instances: { status?: string }[];
};

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

    let tainted;
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
        tainted = resource?.instances.some(
          (instance) => instance.status === "tainted"
        );
        this.label = resource?.name;
        this.description = resource?.type;
        this.tooltip = tainted ? "Tainted" : "Deployed";
        this.iconPath = tainted
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
        this.description = "(Failed to load tfstate)";
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
  readonly onDidChangeTreeData: vscode.Event<TerrastateItem | void> =
    this._onDidChangeTreeData.event;

  private rootItems: TerrastateItem[] = [];

  constructor() {
    this.sync().then(() => {
      const fsWatcher = vscode.workspace.createFileSystemWatcher(
        TF_GLOB,
        true,
        false,
        true
      );

      fsWatcher.onDidChange((changed) =>
        this._onDidChangeTreeData.fire(
          this.rootItems.filter(
            (item) => item.directory === path.dirname(changed.path)
          )[0]
        )
      );

      setInterval(() => this.sync(), 1000);
    });
  }

  async getChildren(element?: TerrastateItem): Promise<TerrastateItem[]> {
    if (element?.directory) {
      try {
        const tfstateFile = path.join(element.directory, "terraform.tfstate");
        const tfstate = JSON.parse(
          (await fsPromises.readFile(tfstateFile)).toString()
        );

        const items = tfstate.resources.map(
          (resource: Resource) =>
            new TerrastateItem({
              type: "resource",
              resource,
              directory: element.directory,
            })
        );

        return items.length ? items : [new TerrastateItem({ type: "none" })];
      } catch (err) {
        if (err.message.startsWith("ENOENT")) {
          return [new TerrastateItem({ type: "none" })];
        } else {
          return [new TerrastateItem({ type: "error" })];
        }
      }
    }

    return this.rootItems;
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
    const files = await vscode.workspace.findFiles(TF_GLOB);
    const dirs = [
      ...new Set(files.map((uri) => path.dirname(uri.path))),
    ].sort();

    if (
      dirs.length !== this.rootItems.length ||
      dirs.some((dir, idx) => dir !== this.rootItems[idx].directory)
    ) {
      this.rootItems = dirs.map(
        (directory) => new TerrastateItem({ type: "directory", directory })
      );
      this._onDidChangeTreeData.fire();
    }
  }
}
