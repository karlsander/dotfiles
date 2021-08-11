import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("scratch.dummy", () => {
      //vscode.commands.executeCommand("workbench.action.togglePanel");
      vscode.commands.executeCommand("workbench.action.positionPanelRight");
    })
  );
}

export function deactivate() {}
