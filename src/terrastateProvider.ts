import * as vscode from 'vscode';
import { promises as fs } from 'fs';
import * as path from 'path';

const TFSTATE_GLOB = "**/terraform.tfstate";

class Item extends vscode.TreeItem {
    tfstateFile?: vscode.Uri;
    resource?: string;

    constructor({ type, tfstateFile, resource }: { type: string, tfstateFile?: vscode.Uri, resource?: string  }) {
        super('', type === "directory" ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None);

        switch (type) {
            case "directory":
                this.label = tfstateFile ? tfstateFile.path : '';
                this.iconPath = path.join(__filename, '..', '..', 'media', 'terraform.svg'); 
                break;
            case "resource":
                this.label = resource;
                this.iconPath = new vscode.ThemeIcon("debug-start");
                break;
            case "none":
                this.description = '(No resources deployed)';
                break;
            default:
                throw new Error(`Invalid type ${type}`);
        }

        this.tfstateFile = tfstateFile;
        this.resource = resource;
    }

}

export class TerrastateProvider implements vscode.TreeDataProvider<Item> {
    private _onDidChangeTreeData: vscode.EventEmitter<Item | undefined | null | void> = new vscode.EventEmitter<Item | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<Item | undefined | null | void> = this._onDidChangeTreeData.event;

    private rootItems: Item[] = [];

    constructor() {
        vscode.workspace.findFiles(TFSTATE_GLOB).then(files => {
            this.rootItems = files.map(uri => new Item({type: 'directory', tfstateFile: uri}));
            this._onDidChangeTreeData.fire();

            const fsWatcher = vscode.workspace.createFileSystemWatcher(TFSTATE_GLOB, false, false, false);

            fsWatcher.onDidCreate(created => {
                this.rootItems.push(new Item({ type: 'directory', tfstateFile: created }));
                this._onDidChangeTreeData.fire();
            });

            fsWatcher.onDidDelete(deleted => {
               this.rootItems = this.rootItems.filter(({ tfstateFile }) => tfstateFile?.path !== deleted.path);
               this._onDidChangeTreeData.fire();
            });

            fsWatcher.onDidChange(changed => {
                this._onDidChangeTreeData.fire(this.rootItems.filter(({ tfstateFile }) => tfstateFile?.path === changed.path)[0]);
            });
        });
    }

    async getChildren(element?: Item): Promise<Item[]> {
        if (element?.tfstateFile) {
            const data = JSON.parse((await fs.readFile(element.tfstateFile.fsPath)).toString());
            const items = data.resources.map(
                ({ type, name }: { type: string, name: string }) => new Item({
                    type: 'resource',
                    resource: `${type}.${name}`
                })
            );

            return items.length ? items : [new Item({ type: "none" })];
        }

        return this.rootItems;
    }

    getTreeItem(element: Item): vscode.TreeItem {
        return element;
    }
}