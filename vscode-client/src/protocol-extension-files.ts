
/**
 * Files extensions to LSP
 *
 * The files extension to the Language Server Protocol (LSP) allows a language
 * server to operate without sharing a physical file system with the client.
 * Instead of consulting its local disk, the language server can query the
 * client for a list of all files and for the contents of specific files.
 *
 * https://github.com/sourcegraph/language-server-protocol/blob/master/extension-files.md
 */

/** */
import { RequestType, RequestHandler } from 'vscode-jsonrpc';
import { TextDocumentIdentifier, TextDocumentItem } from 'vscode-languageserver-types';
import * as vscode from 'vscode';
import * as fs from 'mz/fs';

export interface FilesExtensionClientCapabilities {
  /**
   * The client provides support for workspace/xfiles.
   */
  xfilesProvider?: boolean;
  /**
   * The client provides support for textDocument/xcontent.
   */
  xcontentProvider?: boolean;
}

// workspace/xfiles

export interface ContentParams {
  /**
   * The text document to receive the content for.
   */
  textDocument: TextDocumentIdentifier;
}

/**
 * The content request is sent from the server to the client to request the
 * current content of any text document. This allows language servers to operate
 * without accessing the file system directly.
 */
export namespace ContentRequest {

  export const type: RequestType<ContentParams, TextDocumentItem, void, void> = {
    method: 'textDocument/xcontent',
    _: undefined
  };

  export const handler: RequestHandler<ContentParams, TextDocumentItem, void> =
    async (params: ContentParams, token: vscode.CancellationToken): Promise<TextDocumentItem> => {
      // This is not nice because it will open the text document and emit didOpenTextDocument events,
      // which we don't want. I couldn't find another way to get the text document content from VS Code though
      const textDocument = vscode.workspace.textDocuments.find(doc => doc.uri.toString() === params.textDocument.uri);
      if (textDocument) {
        return {
          uri: textDocument.uri.toString(),
          languageId: textDocument.languageId,
          version: textDocument.version,
          text: textDocument.getText()
        };
      } else {
        // Fall back to reading from disk
        const fsPath = vscode.Uri.parse(params.textDocument.uri).fsPath;
        const text = await fs.readFile(fsPath, 'utf-8');
        return {
          uri: params.textDocument.uri,
          languageId: fsPath.split('.').pop(), // Language ID is the file extension
          text,
          version: -1 // Version is always -1
        }
      }
    }
}

// textDocument/xfiles

export interface FilesParams {
  /**
   * The URI of a directory to search.
   * Can be relative to the rootPath.
   * If not given, defaults to rootPath.
   */
  base?: string;
}

/**
 * The files request is sent from the server to the client to request a list of
 * all files in the workspace or inside the directory of the base parameter, if
 * given.
 */
export namespace FilesRequest {

  export const type: RequestType<FilesParams, TextDocumentIdentifier[], void, void> = {
    method: 'workspace/xfiles',
    _: undefined
  };
  
  export const handler: RequestHandler<FilesParams, TextDocumentIdentifier[], void> =
    async (params: FilesParams, token: vscode.CancellationToken): Promise<TextDocumentIdentifier[]> => {
      const uris = await vscode.workspace.findFiles('**', '', Infinity, token);
      return uris.map(uri => ({ uri: uri.toString() }));
    }
}
