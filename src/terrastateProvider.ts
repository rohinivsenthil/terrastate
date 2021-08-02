import * as vscode from 'vscode';

const TFSTATE_GLOB = "**/terraform.tfstate";

export class TerrastateProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | null | void> = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private tfstateFiles: vscode.Uri[] = [];

    constructor() {
        console.log("hello");

        vscode.workspace.findFiles(TFSTATE_GLOB).then(files => {
            this.tfstateFiles = files;
            this._onDidChangeTreeData.fire();

            const fsWatcher = vscode.workspace.createFileSystemWatcher(TFSTATE_GLOB, false, false, false);

            fsWatcher.onDidCreate(created => {
                this.tfstateFiles.push(created);
                this._onDidChangeTreeData.fire();
            });

            fsWatcher.onDidDelete(deleted => {
                this.tfstateFiles = this.tfstateFiles.filter(uri => uri.toString() !== deleted.toString());
                this._onDidChangeTreeData.fire();
            });

            // TODO: Handle on change events
            // fsWatcher.onDidChange(console.log)
        });
    }

    getChildren(element?: vscode.TreeItem): vscode.TreeItem[] {
        if (element) {
            // TODO: Find and return resources inside tfstate file 
            return [];
        }

        return this.tfstateFiles.map(uri => new vscode.TreeItem(uri));
    }

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }
}