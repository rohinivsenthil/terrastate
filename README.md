<h1 align="center">Terrastate</h1>
<div align="center">
  <strong> Monitor the state of your Terraform resources</strong>  
  <br/> <br/>
  <a href="https://marketplace.visualstudio.com/items?itemName=rohinivsenthil.terrastate&ssr=false#overview"><img src="https://img.shields.io/visual-studio-marketplace/i/rohinivsenthil.terrastate" /></a>
  <a href="https://marketplace.visualstudio.com/items?itemName=rohinivsenthil.terrastate&ssr=false#version-history"><img src="https://img.shields.io/visual-studio-marketplace/v/rohinivsenthil.terrastate" /></a>
  <a href="https://marketplace.visualstudio.com/items?itemName=rohinivsenthil.terrastate&ssr=false#review-details"><img src="https://img.shields.io/visual-studio-marketplace/r/rohinivsenthil.terrastate" /></a>
</div>
<br />

Terrastate is a [Visual Studio Code](https://code.visualstudio.com/) [extension](https://marketplace.visualstudio.com/VSCode) that can be used to monitor, deploy and destroy Terraform resources. You can find the extension [here](https://marketplace.visualstudio.com/items?itemName=rohinivsenthil.terrastate).

## Highlighted Features



## Quick start

**Step 1.** Install the Terrastate extension for Visual Studio Code  
**Step 2.** Click on the Terrastate icon in the side panel  
**Step 3.** The terraform resources defined in the workspace will be listed in the right-side tree view

## Supported Commands

### Folder Level

### Resource Level

| Command                  | Description                                          |
| ------------------------ | ---------------------------------------------------- |


## Issues, feature requests, and contributions

### Issues

- If you come across a problem with the extension, please file an [issue](https://github.com/rohinivsenthil/terrastate/issues/new)
- For list of known issues, please check the [issues tab](https://github.com/rohinivsenthil/terrastate/issues/new)

### Feature requests

- Find planned features for future releases marked as [feature](https://github.com/rohinivsenthil/terrastate/issues?q=is%3Aissue+is%3Aopen+label%3Afeature) under issues tab.
- For new feature requests, please file an [issue](https://github.com/rohinivsenthil/terrastate/issues/new)

### Contributions

Contributions are always welcome!

#### Running the extension locally for development

1. Clone the repository and install dependencies by running `yarn install`
2. Press `F5` to open a new window with your extension loaded.
3. Run your command from the command palette by pressing (`Ctrl+Shift+P` or `Cmd+Shift+P` on Mac) and typing `Terrastate: Focus on Terrastate View`. Alternatively, you can also find the Terrastate icon on the side panel.

#### Folder structure

- **`package.json`** - this is the manifest file in which you declare your extension and command. The plugin registers a command and defines its title and command name. With this information VS Code can show the command in the command palette.
- **`src/extension.ts`**: this is the main file where you will provide the implementation of your command. The file exports one function, `activate`, which is called the very first time your extension is activated (in this case by executing the command). Inside the `activate` function we call `registerCommand`. We pass the function containing the implementation of the command as the second parameter to `registerCommand`.
- **`src/terraform.ts`** this is the file containing function definitions pertaining to Terraform.
- **`src/terraformProvider.ts`** and **`src/graphProvider.ts`**:

#### Making changes

- You can relaunch the extension from the debug toolbar after changing code in `src`.
- You can also reload (`Ctrl+R` or `Cmd+R` on Mac) the VS Code window with your extension to load your changes.
<!-- 
## Related

- Read the [launch blog]
- Featured #11 Product of the day on 
- Featured in **Trending this week** on Visual Studio Code Marketplace -->
