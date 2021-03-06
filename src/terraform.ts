import { spawn } from "child_process";
import * as vscode from "vscode";
import * as semver from "semver";
import { TERRAFORM_VERISON_RANGE } from "./constants";

type Module = {
  resources: Resource[];
  child_modules?: Module[];
};

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
  showError = true
): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { cwd: directory, shell: true });
    let stdout = "";
    let output = `${directory || ""} > ${command} ${JSON.stringify(args)}\n`;
    let error: Error | undefined = undefined;

    proc.stdin.end();

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

      if (error) {
        if (showError) outputChannel.append(output);
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
            JSON.parse(
              await run(terraformPath, ["version", "-json"], undefined, false)
            ).terraform_version,
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
  outputChannel.appendLine(`Using terraform at ${terraformPath}`);

  return true;
}

export async function getResources(directory: string): Promise<string[]> {
  return [
    ...(await run(terraformPath, ["graph", "-no-color"], directory)).matchAll(
      /\[label = "(.*)", shape = "box"]$/gm
    ),
  ].map((i) => i[1]);
}

export async function getDeployedResources(
  directory: string
): Promise<Resource[]> {
  const result = JSON.parse(
    await run(terraformPath, ["show", "-no-color", "-json"], directory)
  );

  let resources: Resource[] = [];
  const handle = (module: Module) => {
    if (!module) return;
    resources = [...resources, ...(module?.resources || [])];
    module.child_modules?.forEach(handle);
  };

  handle(result?.values?.root_module);

  return resources;
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
    directory
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
    directory
  );
}

export async function taint(directory: string, address: string): Promise<void> {
  await run(terraformPath, ["taint", "-no-color", address], directory);
}

export async function untaint(
  directory: string,
  address: string
): Promise<void> {
  await run(terraformPath, ["untaint", "-no-color", address], directory);
}

export async function refresh(directory: string): Promise<void> {
  await run(terraformPath, ["refresh", "-no-color"], directory);
}

export async function validate(directory: string): Promise<void> {
  await run(terraformPath, ["validate", "-no-color"], directory);
}

export async function init(directory: string): Promise<void> {
  await run(terraformPath, ["init", "-no-color"], directory);
}

export async function graph(directory: string): Promise<string> {
  return await run(terraformPath, ["graph"], directory);
}

export { outputChannel };
