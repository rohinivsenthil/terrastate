import { spawn } from "child_process";
import * as vscode from "vscode";
import * as semver from "semver";
import { TERRAFORM_VERISON_RANGE } from "./constants";

export type Resource = {
  address: string;
  name: string;
  type: string;
  tainted?: boolean;
};

const outputChannel = vscode.window.createOutputChannel("Terrastate");
let terraformPath: string;

function run(
  command: string,
  args: string[],
  directory?: string,
  errorMessage?: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { cwd: directory, shell: true });
    let stdout = "";
    let output = `${directory || ""} > ${command} ${JSON.stringify(args)}\n`;
    let error: Error | undefined = undefined;

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
      output += data.toString();
    });

    proc.stderr.on("data", (data) => {
      output += data.toString();
    });

    proc.on("error", (err) => {
      error = err;
      output += `${error.message}\n`;
    });

    proc.on("close", (code) => {
      if (code !== 0) {
        if (!error) {
          error = new Error(`Process exited with non-zero exit code: ${code}`);
        }
        output += `${error.message}\n`;
      }

      outputChannel.append(output);

      if (error) {
        if (errorMessage) {
          vscode.window
            .showErrorMessage(errorMessage, "Show Output")
            .then((value) => {
              if (value === "Show Output") {
                outputChannel.show();
              }
            });
        }
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
}

export async function setTerraformPath(): Promise<boolean> {
  let terraformPaths: string[] | string =
    vscode.workspace.getConfiguration("terrastate").get("terraformPath") ||
    "terraform";

  if (typeof terraformPaths === "string") {
    terraformPaths = [terraformPaths];
  }

  const idx = (
    await Promise.all(
      terraformPaths.map(async (terraformPath) => {
        try {
          return semver.satisfies(
            JSON.parse(await run(terraformPath, ["version", "-json"]))
              .terraform_version,
            TERRAFORM_VERISON_RANGE
          );
        } catch {
          return false;
        }
      })
    )
  ).indexOf(true);

  if (idx === -1) {
    const choice = await vscode.window.showErrorMessage(
      `Cannot find terraform installation that satisfies \`${TERRAFORM_VERISON_RANGE}\`. Set terrastate.terraformPath to point to your terraform installation`,
      "Open Settings"
    );
    if (choice === "Open Settings") {
      vscode.commands.executeCommand(
        "workbench.action.openSettings",
        "terrastate.terraformPath"
      );
    }
    return false;
  }

  terraformPath = terraformPaths[idx];
  return true;
}

export async function getResources(directory: string): Promise<string[]> {
  return [
    ...(
      await run(
        terraformPath,
        ["graph"],
        directory,
        `An error occured when fetching resources for ${directory}`
      )
    ).matchAll(/\[label = "(.*)", shape = "box"]$/gm),
  ].map((i) => i[1]);
}

export async function getDeployedResources(
  directory: string
): Promise<Resource[]> {
  return (
    JSON.parse(
      await run(
        terraformPath,
        ["show", "-no-color", "-json"],
        directory,
        `An error occured when fetching deployed resources for ${directory}`
      )
    )?.values?.root_module?.resources || []
  );
}

export async function destroy(
  directory: string,
  address?: string
): Promise<void> {
  await run(
    terraformPath,
    address
      ? ["destroy", "-auto-approve", "-no-color", "-target", address]
      : ["destroy", "-auto-approve", "-no-color"],
    directory,
    address
      ? `An error occured when destroying ${address} in ${directory}`
      : `An error occured when destroying resources in ${directory}`
  );
}

export async function apply(
  directory: string,
  address?: string
): Promise<void> {
  await run(
    terraformPath,
    address
      ? ["apply", "-auto-approve", "-no-color", "-target", address]
      : ["apply", "-auto-approve", "-no-color"],
    directory,
    address
      ? `An error occured when applying ${address} in ${directory}`
      : `An error occured when applying resources in ${directory}`
  );
}

export async function taint(directory: string, address: string): Promise<void> {
  await run(
    terraformPath,
    ["taint", "-no-color", address],
    directory,
    `An error occured when tainting ${address} in ${directory}`
  );
}

export async function untaint(
  directory: string,
  address: string
): Promise<void> {
  await run(
    terraformPath,
    ["untaint", "-no-color", address],
    directory,
    `An error occured when untainting ${address} in ${directory}`
  );
}

export async function refresh(directory: string): Promise<void> {
  await run(
    terraformPath,
    ["refresh", "-no-color"],
    directory,
    `An error occured when refreshing ${directory}`
  );
}

export async function validate(directory: string): Promise<void> {
  await run(
    terraformPath,
    ["validate", "-no-color"],
    directory,
    `An error occured when validating ${directory}`
  );
}

export async function init(directory: string): Promise<void> {
  await run(
    terraformPath,
    ["init", "-no-color"],
    directory,
    `An error occured when initializing ${directory}`
  );
}
