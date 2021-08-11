<div align="center">   
  <img src="https://raw.githubusercontent.com/rohinivsenthil/terrastate/master/media/terrastate.png" height="130"/>
 </div>
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

<div align="center">
  <img src="https://user-images.githubusercontent.com/42040329/129024519-2017ff8d-229a-402d-83dd-0d623a84ec80.gif"/>
  <br/>
  <sup>Release: 1.0.0</sup>
</div>

## Highlighted Features

- Minimalist UI/UX to show the state of Terraform resources
- Supports Terraform commands on single click
- Shows directory level Terraform graph

## Quick start

**Step 1.** Install the Terrastate extension for Visual Studio Code  
**Step 2.** Click on the Terrastate icon in the side panel  
**Step 3.** The terraform resources defined in the workspace will be listed in the right-side tree view

## Supported Commands

To view the list of commands, left-click on the **directory**/**resource** in the Terrastate View.

### Directory Level

| Command                  | Description                                          |
| ------------------------ | ---------------------------------------------------- |
| Apply All | Runs `terraform apply` on directory level |
| Destory All | Runs `terraform destroy` on directory level |  
| Initialize  | Runs `terraform init` on the directory |  
| Refresh | Runs `terraform refresh` on the directory |
| Validate | Runs `terraform validate` on the directory |

### Resource Level

| Command                  | Description                                          |
| ------------------------ | ---------------------------------------------------- |
| Apply | Runs `terraform apply` targeted on the resource |
| Destory  | Runs `terraform destroy` targeted on the resource |  
| Taint | Runs `terraform taint` targeted on the resource |  
| Untaint | Runs `terraform untaint` targeted on the resource |


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

- **`package.json`**: this is the manifest file in which you declare your extension and command.
- **`src/extension.ts`**: this is the main file where you will provide the implementation of your command. The file exports one function, `activate`, inside which we call `registerCommand`. We pass the function containing the implementation of the command as the second parameter to `registerCommand`.
- **`src/terraform.ts`**: this is the file containing function definitions pertaining to Terraform.
- **`src/terraformProvider.ts`** and **`src/graphProvider.ts`**: these are the files where you will define the Terrastate and Graph tree views respectively.

#### Making changes

- You can relaunch the extension from the debug toolbar after changing code in `src`.
- You can also reload (`Ctrl+R` or `Cmd+R` on Mac) the VS Code window with your extension to load your changes.

## Related

- [MIT License](https://github.com/rohinivsenthil/terrastate/blob/master/LICENSE![terrastate](https://user-images.githubusercontent.com/42040329/129020767-85f8e868-48d1-4dd4-92b4-35026c706f40.gif)
)
<!-- - Read the [launch blog]
- Featured #11 Product of the day on 
- Featured in **Trending this week** on Visual Studio Code Marketplace -->
