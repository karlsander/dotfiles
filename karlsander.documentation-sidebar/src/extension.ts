import * as vscode from "vscode";
import { viewId, WebViewClass } from "./webView";

export function activate(context: vscode.ExtensionContext) {
  /*const provider = new DocsViewViewProvider(context.extensionUri);
  context.subscriptions.push(provider);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(viewId, provider)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("documentation-sidebar.test", () => {
      provider.test();
    })
  );*/

  context.subscriptions.push(
    vscode.commands.registerCommand("documentation-sidebar.toggle", () => {
      let ww = vscode.window.createWebviewPanel(
        viewId,
        "Documentation",
        { viewColumn: -2 },
        {
          enableFindWidget: false,
          enableScripts: true,
          retainContextWhenHidden: false,
          localResourceRoots: [
            vscode.Uri.joinPath(context.extensionUri, "media"),
          ],
        }
      );
      let c = new WebViewClass(ww.webview, context.extensionUri);
      context.subscriptions.push(ww);
      context.subscriptions.push(c);
      ww.onDidDispose(() => c.dispose());
    })
  );
}

export function deactivate() {}
