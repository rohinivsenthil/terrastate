import * as vscode from "vscode";
import * as path from "path";
import { promises as fsPromises } from "fs";

const TF_GLOB = "**/{*.tf,terraform.tfstate}";

type Resource = {
  name: string;
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  instances: any[];
};

class Item extends vscode.TreeItem {
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
              new vscode.ThemeColor("charts.yellow")
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

export class TerrastateProvider implements vscode.TreeDataProvider<Item> {
  private _onDidChangeTreeData: vscode.EventEmitter<Item | void> =
    new vscode.EventEmitter<Item | void>();
  readonly onDidChangeTreeData: vscode.Event<Item | void> =
    this._onDidChangeTreeData.event;

  private rootItems: Item[] = [];

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

  async getChildren(element?: Item): Promise<Item[]> {
    if (element?.directory) {
      try {
        const tfstateFile = path.join(element.directory, "terraform.tfstate");
        const tfstate = JSON.parse(
          (await fsPromises.readFile(tfstateFile)).toString()
        );

        const items = tfstate.resources.map(
          (resource: Resource) =>
            new Item({ type: "resource", resource: resource })
        );

        return items.length ? items : [new Item({ type: "none" })];
      } catch (err) {
        if (err.message.startsWith("ENOENT")) {
          return [new Item({ type: "none" })];
        } else {
          return [new Item({ type: "error" })];
        }
      }
    }

    return this.rootItems;
  }

  getTreeItem(element: Item): vscode.TreeItem {
    return element;
  }

  refresh(): null {
    return null;
  }

  apply(): null {
    return null;
  }

  destroy(): null {
    return null;
  }

  taint(): null {
    return null;
  }

  untaint(): null {
    return null;
  }

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
        (directory) => new Item({ type: "directory", directory })
      );
      this._onDidChangeTreeData.fire();
    }
  }
}
