import * as vscode from "vscode";
import * as path from "path";
import { watch } from "chokidar";
import { Resource, getResources, getDeployedResources } from "./terraform";
import { readdir, promises as fsPromises } from "fs";

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
  readonly onDidChangeTreeData: vscode.Event<TerrastateItem | void> =
    this._onDidChangeTreeData.event;

  private rootItems: TerrastateItem[] = [];

  constructor() {
    (vscode.workspace.workspaceFolders || []).forEach(({ uri }) => {
      const watcher = watch(path.join(uri.path, TF_GLOB));

      watcher
        .on("unlink", (unlinked) => {
          const directory = path.dirname(unlinked);
          readdir(directory, (err, files) => {
            if (
              err ||
              !files.some((file) => /(.*\.tf|terraform\.tfstate)$/.test(file))
            ) {
              this.rootItems = this.rootItems.filter(
                (item) => item.directory !== directory
              );
              this._onDidChangeTreeData.fire();
            } else {
              this._onDidChangeTreeData.fire(
                this.rootItems.filter((item) => item.directory === directory)[0]
              );
            }
          });
        })
        .on("change", (changed) => {
          const directory = path.dirname(changed);
          const item = this.rootItems.filter(
            (item) => item.directory === directory
          )[0];
          this._onDidChangeTreeData.fire(item);
        })
        .on("add", (added) => {
          const directory = path.dirname(added);
          const item = this.rootItems.filter(
            (item) => item.directory === directory
          )[0];
          if (item) {
            this._onDidChangeTreeData.fire(item);
          } else {
            this.rootItems.push(
              new TerrastateItem({ type: "directory", directory })
            );
            this._onDidChangeTreeData.fire();
          }
        });
    });

    setInterval(async () => {
      const exists = await Promise.all(
        this.rootItems.map(async (item) => {
          try {
            await fsPromises.access(item.directory ?? "");
            return true;
          } catch {
            return false;
          }
        })
      );

      this.rootItems = this.rootItems.filter((_, idx) => exists[idx]);
    }, 1000);
  }

  async getChildren(element?: TerrastateItem): Promise<TerrastateItem[]> {
    if (element?.directory) {
      console.log(element.directory);

      try {
        const deployedResources = await getDeployedResources(element.directory);
        const dormantResources = (await getResources(element.directory)).filter(
          (i) => deployedResources?.every(({ address }) => address !== i)
        );

        const items: TerrastateItem[] = [
          ...deployedResources.map(
            (resource) => new TerrastateItem({ type: "resource", resource })
          ),
        ];

        return items.length ? items : [new TerrastateItem({ type: "none" })];
      } catch (err) {
        return [new TerrastateItem({ type: "error" })];
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

  sync(): void {
    this._onDidChangeTreeData.fire();
  }
}
