import * as vscode from 'vscode';
import { promises as fs } from 'fs';

const TFSTATE_GLOB = "**/terraform.tfstate";

class Item extends vscode.TreeItem {
    tfStateFile: vscode.Uri;
    resource?: string;

    constructor(tfstateFile: vscode.Uri, resource?: string) {
        super(
            resource || tfstateFile.path,
            resource ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Expanded
        );

        this.tfStateFile = tfstateFile;
        this.resource = resource;

        this.iconPath = resource ? new vscode.ThemeIcon("debug-start") : undefined; 
    }

}

export class TerrastateProvider implements vscode.TreeDataProvider<Item> {
    private _onDidChangeTreeData: vscode.EventEmitter<Item | undefined | null | void> = new vscode.EventEmitter<Item | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<Item | undefined | null | void> = this._onDidChangeTreeData.event;

    private rootItems: Item[] = [];

    constructor() {
        vscode.workspace.findFiles(TFSTATE_GLOB).then(files => {
            this.rootItems = files.map(uri => new Item(uri));
            this._onDidChangeTreeData.fire();

            const fsWatcher = vscode.workspace.createFileSystemWatcher(TFSTATE_GLOB, false, false, false);

            fsWatcher.onDidCreate(created => {
                this.rootItems.push(new Item(created));
                this._onDidChangeTreeData.fire();
            });

            fsWatcher.onDidDelete(deleted => {
               this.rootItems = this.rootItems.filter(item => item.tfStateFile.path !== deleted.path);
               this._onDidChangeTreeData.fire();
            });

            fsWatcher.onDidChange(changed => {
                this._onDidChangeTreeData.fire(this.rootItems.filter(item => item.tfStateFile.path === changed.path)[0]);
            });
        });
    }

    async getChildren(element?: Item): Promise<Item[]> {
        if (element) {
            const data = JSON.parse((await fs.readFile(element.tfStateFile.fsPath)).toString());
            return data.resources.map(({ type, name }: { type:string, name: string }) => new Item(data.tfStateFile, `${type}.${name}`));
        }

        return this.rootItems;
    }

    getTreeItem(element: Item): vscode.TreeItem {
        return element;
    }
}