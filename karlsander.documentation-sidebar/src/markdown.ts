import * as vscode from "vscode";

function processMarkdown(markdown: string): string {
  let withCodeURLs = markdown.replaceAll("file:///", "openfile://");
  return withCodeURLs;
}

/**
 * Takes a markdown string and turns it into an html fragment using the VSCode `markdown.api.render` command.
 * Includes syntax highlighting with `hljs-*` classes.
 */
async function markdownToHTML(markdown: string): Promise<string> {
  const transformedMarkdown = processMarkdown(markdown);
  return (await vscode.commands.executeCommand(
    "markdown.api.render",
    transformedMarkdown
  )) as string;
}

/**
 * Turn an array of {@link vscode.Hover} into a markdown string.
 * All {@link vscode.Hover hovers} that have content are appended together.
 */
function getMarkdownFromHovers(hovers: vscode.Hover[]): string {
  const parts = hovers
    .flatMap((hover) => hover.contents)
    .map((content) => getMarkdown(content))
    .filter((content) => content.length > 0);

  if (!parts.length) {
    return "";
  }

  return parts.join("\n \n <hr> \n \n");
}

/** Tries different methods of getting a markdown string from a hover `.content` */
function getMarkdown(content: vscode.MarkedString): string {
  if (typeof content === "string") {
    return content;
  } else if (content instanceof vscode.MarkdownString) {
    return content.value;
  } else {
    const markdown = new vscode.MarkdownString();
    markdown.appendCodeblock(content.value, content.language);
    return markdown.value;
  }
}

export { getMarkdownFromHovers, markdownToHTML };
