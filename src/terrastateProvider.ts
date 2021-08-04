import * as vscode from "vscode";
import { promises as fs } from "fs";
import * as path from "path";

const TFSTATE_GLOB = "**/terraform.tfstate";

type Resource = {
  name: string;
  type: string;
};

class Item extends vscode.TreeItem {
  tfstateFile?: vscode.Uri;
  resource?: Resource;

  constructor({
    type,
    tfstateFile,
    resource,
  }: {
    type: string;
    tfstateFile?: vscode.Uri;
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
        this.label = tfstateFile
          ? path.dirname(
              vscode.workspace.asRelativePath(tfstateFile.path, true)
            )
          : "";
        this.iconPath = path.join(__filename, "../../media/terraform.svg");
        break;
      case "resource":
        this.label = resource.name;
        this.description = resource.type;
        this.iconPath = new vscode.ThemeIcon("debug-start");
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
    this.tfstateFile = tfstateFile;
    this.resource = resource;
  }
}

export class TerrastateProvider implements vscode.TreeDataProvider<Item> {
  private _onDidChangeTreeData: vscode.EventEmitter<
    Item | undefined | null | void
  > = new vscode.EventEmitter<Item | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<Item | undefined | null | void> =
    this._onDidChangeTreeData.event;

  private rootItems: Item[] = [];

  constructor() {
    const fsWatcher = vscode.workspace.createFileSystemWatcher(
      TFSTATE_GLOB,
      false,
      false,
      false
    );

    fsWatcher.onDidCreate((created) => {
      this.rootItems.push(
        new Item({ type: "directory", tfstateFile: created })
      );
      this.rootItems.sort((a, b) =>
        (a.label || "") > (b.label || "") ? 1 : -1
      );
      this._onDidChangeTreeData.fire();
    });

    fsWatcher.onDidDelete((deleted) => {
      this.rootItems = this.rootItems.filter(
        ({ tfstateFile }) => tfstateFile?.path !== deleted.path
      );
      this._onDidChangeTreeData.fire();
    });

    fsWatcher.onDidChange((changed) => {
      this._onDidChangeTreeData.fire(
        this.rootItems.filter(
          ({ tfstateFile }) => tfstateFile?.path === changed.path
        )[0]
      );
    });

    setInterval(() => {
      vscode.workspace.findFiles(TFSTATE_GLOB).then((files) => {
        this.rootItems = files.map(
          (uri) => new Item({ type: "directory", tfstateFile: uri })
        );
        this.rootItems.sort((a, b) =>
          (a.label || "") > (b.label || "") ? 1 : -1
        );
        this._onDidChangeTreeData.fire();
      });
    }, 1000);
  }

  async getChildren(element?: Item): Promise<Item[]> {
    if (element?.tfstateFile) {
      try {
        const data = JSON.parse(
          (await fs.readFile(element.tfstateFile.fsPath)).toString()
        );
        const items = data.resources.map(
          (resource: Resource) =>
            new Item({ type: "resource", resource: resource })
        );

        return items.length ? items : [new Item({ type: "none" })];
      } catch (err) {
        return [new Item({ type: "error" })];
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
}
