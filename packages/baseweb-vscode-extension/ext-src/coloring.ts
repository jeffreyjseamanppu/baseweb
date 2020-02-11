import * as vscode from 'vscode';
import {LightTheme, DarkTheme} from 'baseui';

export default (context: vscode.ExtensionContext) => {
  let timeout: NodeJS.Timer | undefined = undefined;
  let activeEditor = vscode.window.activeTextEditor;

  const decorationTypeMap = {};

  // Create a decorator type that we use to decorate small numbers
  const getColorDecorationType = (coloringStyle: string, colorVal: string) => {
    // Map decorators and do not create any new ones for the same color value
    if (colorVal && decorationTypeMap[colorVal]) {
      return decorationTypeMap[colorVal];
    }
    const decorationType = vscode.window.createTextEditorDecorationType({
      borderWidth:
        coloringStyle === 'border'
          ? '2px'
          : coloringStyle === 'underline'
          ? '0 0 2px'
          : '0',
      borderStyle: 'solid',
      borderColor: colorVal,
      backgroundColor:
        coloringStyle === 'background' ? colorVal : 'transparent',
    });
    decorationTypeMap[colorVal] = decorationType;
    return decorationType;
  };

  function updateDecorations() {
    if (!activeEditor) {
      return;
    }

    const workspaceConfig = vscode.workspace.getConfiguration('baseweb');
    const isColoringOn = workspaceConfig.get('theme.coloring.enabled');
    if (!isColoringOn) {
      return;
    }
    const themeMode = workspaceConfig.get('theme.coloring.source');
    const theme = themeMode === 'Light' ? LightTheme : DarkTheme;
    const coloringStyle: string =
      workspaceConfig.get('theme.coloring.style') || '';

    const regEx = /(^|\W)(colors\.\w+)/gm;
    const text = activeEditor.document.getText();
    let match;
    // Find matches and decorate accordingly
    while ((match = regEx.exec(text))) {
      const themeColorVal: string | undefined = theme.colors[match[2].slice(7)];
      // Do not decorate if the color key is not present in the theme object
      if (!themeColorVal) {
        continue;
      }
      // Start position excluding the `colors.` part
      const startPos = activeEditor.document.positionAt(
        match.index + match[1].length + 7,
      );
      const endPos = activeEditor.document.positionAt(
        match.index + match[1].length + match[2].length,
      );
      // It should never get to here if `!themeColorVal`
      // but adding a default `transparent` to satisfy types
      const colorVal: string = themeColorVal || 'transparent';
      const decoration = {
        range: new vscode.Range(startPos, endPos),
        hoverMessage: `${colorVal} | ${themeMode}Theme`,
      };
      activeEditor.setDecorations(
        getColorDecorationType(coloringStyle, colorVal),
        [decoration],
      );
    }
  }

  function triggerUpdateDecorations() {
    if (timeout) {
      clearTimeout(timeout);
      timeout = undefined;
    }
    timeout = setTimeout(updateDecorations, 200);
  }

  if (activeEditor) {
    triggerUpdateDecorations();
  }

  vscode.workspace.onDidChangeConfiguration(event => {
    if (
      event.affectsConfiguration('baseweb.theme.coloring.enabled') ||
      event.affectsConfiguration('baseweb.theme.coloring.source') ||
      event.affectsConfiguration('baseweb.theme.coloring.style')
    ) {
      triggerUpdateDecorations();
    }
  }),
    vscode.window.onDidChangeActiveTextEditor(
      editor => {
        activeEditor = editor;
        if (editor) {
          triggerUpdateDecorations();
        }
      },
      null,
      context.subscriptions,
    );

  vscode.workspace.onDidChangeTextDocument(
    event => {
      if (activeEditor && event.document === activeEditor.document) {
        triggerUpdateDecorations();
      }
    },
    null,
    context.subscriptions,
  );
};
