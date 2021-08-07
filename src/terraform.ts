import { spawn } from "child_process";
import * as vscode from "vscode";

export type Resource = {
  address: string;
  name: string;
  type: string;
  tainted?: boolean;
};

const outputChannel = vscode.window.createOutputChannel("Terrastate");

function run(
  command: string,
  args: string[],
  directory: string,
  errorMessage: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { cwd: directory, shell: true });
    let stdout = "";
    let output = `${directory} > ${command} ${JSON.stringify(args)}\n`;
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
        vscode.window
          .showErrorMessage(errorMessage, "Show Output")
          .then((value) => {
            if (value === "Show Output") {
              outputChannel.show();
            }
          });
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
}

export async function getResources(directory: string): Promise<string[]> {
  return [
    ...(
      await run(
        "terraform",
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
        "terraform",
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
    "terraform",
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
    "terraform",
    address
      ? ["apply", "-auto-approve", "-no-color", "-target", address]
      : ["apply", "-auto-approve", "-no-color"],
    directory,
    address
      ? `An error occured when applying ${address} in ${directory}`
      : `An error occured when applying resources in ${directory}`
  );
}
