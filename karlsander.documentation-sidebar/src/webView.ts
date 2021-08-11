import * as vscode from "vscode";
import { getMarkdownFromHovers, markdownToHTML } from "./markdown";
import {
  CacheKey,
  cacheKeyNone,
  createCacheKey,
  cacheKeyEquals,
} from "./Cache";
import { getNonce } from "./getNonce";

/** The ID that identifies the view to vscode, commonly specified as as the `viewType` member on a class */
export const viewId = "documentation-sidebar.sidebar";

/** Uses vscode command to get all hovers from an editor instance */
function getHoversAtCurrentPositionInEditor(editor: vscode.TextEditor) {
  return vscode.commands.executeCommand<vscode.Hover[]>(
    "vscode.executeHoverProvider",
    editor.document.uri,
    editor.selection.active
  );
}

/**
 * Returns the html content of the hovers as well as the documentation title for the currently active editor
 * requires a `vscode.CancellationToken`
 */
async function getHtmlContentForActiveEditor(
  token: vscode.CancellationToken
): Promise<{ title: string; html: string }> {
  let title = "Documentation";
  let html = "";
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return { html, title };
  }

  const hovers = await getHoversAtCurrentPositionInEditor(editor);
  if (token.isCancellationRequested) {
    return { html, title };
  }

  if (hovers?.length) {
    const md = getMarkdownFromHovers(hovers);
    html = await markdownToHTML(md);
    return { html, title };
  } else {
    return { html, title };
  }
}

/**
 * Given a webview and some context, returns a html string with the right security headers, scripts and styles
 * @param webview The webview you want to create the html for. this is used to create the right resource urls and CSP Tags.
 * @param extensionUri The base url of the extension. Should have a `media` folder in it that contains css and js.
 * @returns full html page string to assign to the given webview
 */
function getHtmlForWebview(webview: vscode.Webview, extensionUri: vscode.Uri) {
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "media", "main.js")
  );
  const styleUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "media", "main.css")
  );

  const nonce = getNonce();

  return /* html */ `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="
					default-src 'none';
					style-src ${webview.cspSource} 'unsafe-inline';
					script-src 'nonce-${nonce}';
					img-src data: https:;
				">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${styleUri}" rel="stylesheet">
        <title>Documentation View</title>
			</head>
			<body>
				<article id="main"></article>
				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
}

export class WebViewClass {
  private readonly _disposables: vscode.Disposable[] = [];

  private _view?: vscode.Webview;
  private _currentCacheKey: CacheKey = cacheKeyNone;
  private _loading?: { cts: vscode.CancellationTokenSource };

  constructor(
    private readonly _webView: vscode.Webview,
    private readonly _extensionUri: vscode.Uri
  ) {
    this._view = _webView;
    vscode.window.onDidChangeActiveTextEditor(
      () => {
        this.update();
      },
      null,
      this._disposables
    );

    vscode.window.onDidChangeTextEditorSelection(
      () => {
        this.update();
      },
      null,
      this._disposables
    );

    vscode.workspace.onDidChangeConfiguration(
      () => {
        this.updateConfiguration();
      },
      null,
      this._disposables
    );
    this._view.html = getHtmlForWebview(_webView, _extensionUri);
    this._view.onDidReceiveMessage(this.handleMessage);
    this.updateConfiguration();
    this.update();
  }

  handleMessage(message: { command: string; text: string }) {
    switch (message.command) {
      case "openFile": {
        let [path, lines] = message.text.split("#");
        let lineSeg = lines.split(",")[0];
        let column = Number(lines.split(",")[1]);
        let line = Number(lineSeg.split("L")[1]);
        var openPath = vscode.Uri.parse(path);
        vscode.workspace.openTextDocument(openPath).then((doc) => {
          vscode.window
            .showTextDocument(doc, vscode.ViewColumn.Beside, false)
            .then((editor) => {
              let range = editor.document.lineAt(line - 1).range;
              editor.selection = new vscode.Selection(
                new vscode.Position(line - 1, column - 1),
                new vscode.Position(line - 1, column - 1)
              );
              editor.revealRange(range);
            });
        });
      }
    }
  }
  dispose() {
    let item: vscode.Disposable | undefined;
    while ((item = this._disposables.pop())) {
      item.dispose();
    }
  }

  private async update(ignoreCache = false) {
    if (!this._view) {
      return;
    }

    const newCacheKey = createCacheKey(vscode.window.activeTextEditor);
    if (!ignoreCache && cacheKeyEquals(this._currentCacheKey, newCacheKey)) {
      return;
    }

    this._currentCacheKey = newCacheKey;

    if (this._loading) {
      this._loading.cts.cancel();
      this._loading = undefined;
    }

    const loadingEntry = { cts: new vscode.CancellationTokenSource() };
    this._loading = loadingEntry;

    const updatePromise = (async () => {
      const { html, title } = await getHtmlContentForActiveEditor(
        loadingEntry.cts.token
      );
      if (loadingEntry.cts.token.isCancellationRequested) {
        return;
      }

      if (this._loading !== loadingEntry) {
        // A new entry has started loading since we started
        return;
      }
      this._loading = undefined;

      if (html.length) {
        this._view?.postMessage({
          type: "update",
          body: html,
        });
      } else {
        this._view?.postMessage({
          type: "noContent",
          body: "No documentation found at current cursor position",
        });
      }
    })();

    await Promise.race([
      updatePromise,

      // Don't show progress indicator right away, which causes a flash
      new Promise<void>((resolve) => setTimeout(resolve, 250)).then(() => {
        if (loadingEntry.cts.token.isCancellationRequested) {
          return;
        }
        return vscode.window.withProgress(
          { location: { viewId } },
          () => updatePromise
        );
      }),
    ]);
  }

  private updateConfiguration() {
    const config = vscode.workspace.getConfiguration("documentation-sidebar");
  }

  public test() {}
}
