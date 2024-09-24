import * as vscode from 'vscode';
import { parse } from 'yaml';

export function activate(context: vscode.ExtensionContext) {
    const provider = vscode.languages.registerCompletionItemProvider(
        { language: 'yaml', scheme: 'file' },
        {
            provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext) {
                const fileName = vscode.window.activeTextEditor?.document.fileName;
                console.log('fooo');
                // log .
                if (fileName && fileName.endsWith("recipe.yml")) {
                    const linePrefix = document.lineAt(position).text.substr(0, position.character);
                    if (!linePrefix.endsWith(' ')) {
                        // foo.
                        return undefined;
                    }
                    // Example YAML completion items
                    const completions = [
                        new vscode.CompletionItem('name: ', vscode.CompletionItemKind.Field),
                        new vscode.CompletionItem('version: ', vscode.CompletionItemKind.Field),
                        {
                            label: 'dependencies:',
                            kind: vscode.CompletionItemKind.Module,
                            insertText: 'dependencies:\n  ',
                            documentation: new vscode.MarkdownString("List of package dependencies")
                        }
                    ];

                    return completions;
                }
                return undefined;
            }
        },
        ' ' // Trigger completion after a space
    );

    context.subscriptions.push(provider);
}

export function deactivate() {}