// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

const TFSTATE_GLOB = "**/terraform.tfstate";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "terrastate" is now active!');

	const tfstateFiles = await vscode.workspace.findFiles(TFSTATE_GLOB);

	const fsWatcher = vscode.workspace.createFileSystemWatcher(TFSTATE_GLOB, false, false, false);

	// fsWatcher.onDidCreate(() => {})
	// fsWatcher.onDidChange(() => {})
	// fsWatcher.onDidDelete(() => {})
}

// this method is called when your extension is deactivated
export function deactivate() {}
