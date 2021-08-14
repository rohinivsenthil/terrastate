import * as vscode from "vscode";
import * as path from "path";
import { DEPLOYED, DIRECTORY, DORMANT, TAINTED, TF_GLOB } from "./constants";
import {
  apply,
  destroy,
  getDeployedResources,
  getResources,
  init,
  refresh,
  Resource,
  taint,
  untaint,
  validate,
} from "./terraform";

type ItemType = "module" | "resource" | "no-resources" | "error";

class Item extends vscode.TreeItem {
  type: ItemType;
  directory: string;
  resource?: Resource;
  topLevel: boolean;
  deployed?: boolean;
  module?: string;
  fullModule?: string;

  subModules?: Map<string, Item>;
  resources?: Map<string, Item>;

  constructor({
    type,
    directory,
    resource,
    topLevel,
    deployed,
    module,
    fullModule,
  }: {
    type: ItemType;
    directory: string;
    resource?: Resource;
    topLevel: boolean;
    deployed?: boolean;
    module?: string;
    fullModule?: string;
  }) {
    super("", vscode.TreeItemCollapsibleState.None);

    this.type = type;
    this.directory = directory;
    this.resource = resource;
    this.topLevel = topLevel;
    this.deployed = deployed;
    this.module = module;
    this.fullModule = fullModule;

    if (type === "module") {
      this.subModules = new Map();
      this.resources = new Map();
      this.contextValue = `${topLevel ? "top-" : ""}module`;
      this.label = topLevel ? directory : module;
      this.tooltip = topLevel ? directory : module;
      this.iconPath = DIRECTORY;
      this.description = topLevel ? "" : "module";
      this.collapsibleState = topLevel
        ? vscode.TreeItemCollapsibleState.Expanded
        : vscode.TreeItemCollapsibleState.Collapsed;
    } else if (type === "resource") {
      this.contextValue = `${deployed ? "deployed-" : "dormant-"}resource`;
      this.label = resource?.name;
      this.description = resource?.type;
      this.tooltip = `${deployed ? "Deployed" : "Not Deployed"}${
        resource?.tainted ? " • Tainted" : ""
      }`;
      this.iconPath = resource?.tainted
        ? TAINTED
        : deployed
        ? DEPLOYED
        : DORMANT;
    } else if (type === "no-resources") {
      this.contextValue = "no-resources";
      this.description = "(No resources found)";
    } else if (type === "error") {
      this.contextValue = "error";
      this.description = "(Failed to load resources)";
    }
  }

  getSubModule(module: string) {
    if (!this.subModules?.has(module)) {
      const subModule = new Item({
        type: "module",
        directory: this.directory,
        module: module,
        fullModule: `${this.topLevel ? "" : this.module + "."}module.${module}`,
        topLevel: false,
      });
      this.subModules?.set(module, subModule);
    }

    return this.subModules?.get(module);
  }

  addResource(resource: Resource, deployed: boolean) {
    this.resources?.set(
      resource.address,
      new Item({
        type: "resource",
        directory: this.directory,
        resource,
        topLevel: false,
        deployed,
      })
    );
  }
}

export class TerrastateProvider implements vscode.TreeDataProvider<Item> {
  private _onDidChangeTreeData: vscode.EventEmitter<
    Item | undefined | null | void
  > = new vscode.EventEmitter<Item | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<Item | undefined | null | void> =
    this._onDidChangeTreeData.event;

  private topLevelModules: Map<string, Item> = new Map();

  constructor() {
    const watcher = vscode.workspace.createFileSystemWatcher(TF_GLOB);
    watcher.onDidChange(({ fsPath }) => this.update(path.dirname(fsPath)));
    watcher.onDidCreate(({ fsPath }) => this.update(path.dirname(fsPath)));
    watcher.onDidDelete(({ fsPath }) => this.update(path.dirname(fsPath)));
    setInterval(() => this.update(), 1000);
  }

  getTreeItem(element: Item): vscode.TreeItem {
    return element;
  }

  getChildren(element?: Item): Item[] {
    if (element) {
      return [
        ...[...(element.subModules?.keys() || [])]
          .sort()
          .map((key) => element.subModules?.get(key) as Item),
        ...[...(element.resources?.keys() || [])]
          .sort()
          .map((key) => element.resources?.get(key) as Item),
      ];
    } else {
      return [...this.topLevelModules.keys()]
        .sort()
        .map((key) => this.topLevelModules.get(key) as Item);
    }
  }

  private async update(directory?: string) {
    if (directory) {
      this.topLevelModules.set(
        directory,
        new Item({ type: "module", directory, topLevel: true })
      );

      (await getResources(directory)).map((address) => {
        const parts = address.split(".");
        let parent = this.topLevelModules.get(directory);
        if (parts.length > 2) {
          parts
            .slice(0, -2)
            .filter((val, idx) => idx % 2 === 1)
            .forEach((module) => (parent = parent?.getSubModule(module)));
        }
        parent?.addResource(
          {
            address,
            type: parts[parts.length - 2],
            name: parts[parts.length - 1],
          },
          false
        );
      });

      (await getDeployedResources(directory)).map((resource) => {
        const parts = resource.address.split(".");
        let parent = this.topLevelModules.get(directory);
        if (parts.length > 2) {
          parts
            .slice(0, -2)
            .filter((val, idx) => idx % 2 === 1)
            .forEach((module) => (parent = parent?.getSubModule(module)));
        }
        parent?.addResource(resource, true);
      });

      this._onDidChangeTreeData.fire();
    } else {
      const directories = new Set(
        (await vscode.workspace.findFiles(TF_GLOB)).map(({ fsPath }) =>
          path.dirname(fsPath)
        )
      );

      let updated = false;

      [...this.topLevelModules.keys()].forEach((key) => {
        if (!directories.has(key)) {
          updated = true;
          this.topLevelModules.delete(key);
        }
      });

      await Promise.all(
        [...directories].map(async (key) => {
          if (!this.topLevelModules.has(key)) {
            updated = true;
            await this.update(key);
          }
        })
      );

      if (updated) this._onDidChangeTreeData.fire();
    }
  }

  async apply(element: Item): Promise<void> {
    if (element.type === "module" && element.topLevel) {
      apply(element.directory);
    } else if (element.type === "module") {
      apply(element.directory, element.fullModule);
    } else if (element.type === "resource") {
      apply(element.directory, element.resource?.address);
    }
  }

  async destroy(element: Item): Promise<void> {
    if (element.type === "module" && element.topLevel) {
      destroy(element.directory);
    } else if (element.type === "module") {
      destroy(element.directory, element.fullModule);
    } else if (element.type === "resource") {
      destroy(element.directory, element.resource?.address);
    }
  }

  async init(element: Item): Promise<void> {
    init(element.directory);
  }

  async refresh(element: Item): Promise<void> {
    refresh(element.directory);
  }

  sync(): void {
    this.topLevelModules.clear();
  }

  async taint(element: Item): Promise<void> {
    taint(element.directory, element.resource?.address as string);
  }

  async untaint(element: Item): Promise<void> {
    untaint(element.directory, element.resource?.address as string);
  }

  async validate(element: Item): Promise<void> {
    validate(element.directory);
  }
}
