import { execFile } from "child_process";

export type Resource = {
  address: string;
  name: string;
  type: string;
  tainted?: boolean;
};

export function getResources(directory: string): Promise<string[]> {
  return new Promise((resolve) => {
    execFile("terraform", ["graph"], { cwd: directory }, (err, stdout) => {
      resolve(
        err
          ? []
          : [...stdout.matchAll(/\[label = "(.*)", shape = "box"]$/gm)].map(
              (i) => i[1]
            )
      );
    });
  });
}

export function getDeployedResources(directory: string): Promise<Resource[]> {
  return new Promise((resolve) => {
    execFile(
      "terraform",
      ["show", "-json"],
      { cwd: directory },
      (err, stdout) => {
        resolve(
          err ? [] : JSON.parse(stdout)?.values?.root_module?.resources || []
        );
      }
    );
  });
}

export function destroy(directory: string, address?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(
      "terraform",
      address
        ? ["destroy", "-auto-approve", "-target", address]
        : ["destroy", "-auto-approve"],
      { cwd: directory },
      (err) => {
        if (err) {
          reject(err);
        }
        resolve();
      }
    );
  });
}

export function apply(directory: string, address?: string): Promise<void> {
  console.log(directory, address)
  return new Promise((resolve, reject) => {
    execFile(
      "terraform",
      address
        ? ["apply", "-auto-approve", "-target", address]
        : ["apply", "-auto-approve"],
      { cwd: directory },
      (err) => {
        if (err) {
          console.log(err);
          reject(err);
        }
        resolve();
      }
    );
  });
}
