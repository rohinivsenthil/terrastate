import * as vscode from "vscode";
import * as path from "path";
import { DEPLOYED, DIRECTORY, DORMANT, TAINTED, TF_GLOB } from "./constants";
import {
  apply,
  destroy,
  getDeployedResources,
  getResources,
  init,
  outputChannel,
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
  error?: Item;

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

  addError() {
    this.error = new Item({
      type: "error",
      directory: this.directory,
      topLevel: false,
    });
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
      const children = [
        ...(element.error ? [element.error] : []),
        ...[...(element.subModules?.keys() || [])]
          .sort()
          .map((key) => element.subModules?.get(key) as Item),
        ...[...(element.resources?.keys() || [])]
          .sort()
          .map((key) => element.resources?.get(key) as Item),
      ];

      return children.length
        ? children
        : [
            new Item({
              type: "no-resources",
              directory: element.directory,
              topLevel: false,
            }),
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

      try {
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
      } catch (err) {
        this.topLevelModules.get(directory)?.addError();
      }

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
    try {
      if (element.type === "module" && element.topLevel) {
        await apply(element.directory);
      } else if (element.type === "module") {
        await apply(element.directory, element.fullModule);
      } else if (element.type === "resource") {
        await apply(element.directory, element.resource?.address);
      }
    } catch (err) {
      let showOutput = false;
      if (element.type === "module" && element.topLevel) {
        showOutput =
          (await vscode.window.showErrorMessage(
            `An error occured when applying ${element.directory}`,
            "Show Output"
          )) === "Show Output";
      } else if (element.type === "module") {
        showOutput =
          (await vscode.window.showErrorMessage(
            `An error occured when applying module "${element.fullModule}" in ${element.directory}`,
            "Show Output"
          )) === "Show Output";
      } else if (element.type === "resource") {
        showOutput =
          (await vscode.window.showErrorMessage(
            `An error occured when applying resource "${element.resource?.address}" in ${element.directory}`,
            "Show Output"
          )) === "Show Output";
      }

      if (showOutput) {
        outputChannel.show();
      }
    }
  }

  async destroy(element: Item): Promise<void> {
    try {
      if (element.type === "module" && element.topLevel) {
        await destroy(element.directory);
      } else if (element.type === "module") {
        await destroy(element.directory, element.fullModule);
      } else if (element.type === "resource") {
        await destroy(element.directory, element.resource?.address);
      }
    } catch (err) {
      console.log("hello");
      console.log(err);

      let showOutput = false;
      if (element.type === "module" && element.topLevel) {
        showOutput =
          (await vscode.window.showErrorMessage(
            `An error occured when destroying ${element.directory}`,
            "Show Output"
          )) === "Show Output";
      } else if (element.type === "module") {
        showOutput =
          (await vscode.window.showErrorMessage(
            `An error occured when destroying module "${element.fullModule}" in ${element.directory}`,
            "Show Output"
          )) === "Show Output";
      } else if (element.type === "resource") {
        showOutput =
          (await vscode.window.showErrorMessage(
            `An error occured when destroying resource "${element.resource?.address}" in ${element.directory}`,
            "Show Output"
          )) === "Show Output";
      }

      if (showOutput) {
        outputChannel.show();
      }
    }
  }

  async init(element: Item): Promise<void> {
    try {
      await init(element.directory);
    } catch (err) {
      if (
        (await vscode.window.showErrorMessage(
          `An error occured when initializing ${element.directory}`,
          "Show Output"
        )) === "Show Output"
      ) {
        outputChannel.show();
      }
    }
  }

  async refresh(element: Item): Promise<void> {
    try {
      await refresh(element.directory);
    } catch (err) {
      if (
        (await vscode.window.showErrorMessage(
          `An error occured when refreshing ${element.directory}`,
          "Show Output"
        )) === "Show Output"
      ) {
        outputChannel.show();
      }
    }
  }

  sync(): void {
    this.topLevelModules.clear();
  }

  async taint(element: Item): Promise<void> {
    try {
      await taint(element.directory, element.resource?.address as string);
    } catch (err) {
      if (
        (await vscode.window.showErrorMessage(
          `An error occured when tainting resource "${element.resource?.address}" in ${element.directory}`,
          "Show Output"
        )) === "Show Output"
      ) {
        outputChannel.show();
      }
    }
  }

  async untaint(element: Item): Promise<void> {
    try {
      await untaint(element.directory, element.resource?.address as string);
    } catch (err) {
      if (
        (await vscode.window.showErrorMessage(
          `An error occured when untainting resource "${element.resource?.address}" in ${element.directory}`,
          "Show Output"
        )) === "Show Output"
      ) {
        outputChannel.show();
      }
    }
  }

  async validate(element: Item): Promise<void> {
    try {
      await validate(element.directory);
    } catch (err) {
      if (
        (await vscode.window.showErrorMessage(
          `An error occured when validating  ${element.directory}`,
          "Show Output"
        )) === "Show Output"
      ) {
        outputChannel.show();
      }
    }
  }
}
