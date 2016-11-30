/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as net from 'net';

import { workspace, ExtensionContext, Disposable } from 'vscode';
import {
	LanguageClientOptions,
	SettingMonitor,
	ServerOptions,
	ErrorAction,
	ErrorHandler,
	CloseAction,
	TransportKind
} from 'vscode-languageclient';
import { TextDocumentIdentifier } from 'vscode-languageserver-types';
import { InitializeParams, TextDocumentSyncKind, InitializeResult } from 'vscode-languageclient/lib/protocol';
import { FilesRequest, ContentRequest } from './protocol-extension-files';
import * as vscode from 'vscode';

import { LanguageClient } from './language-client';

function startLangServer(command: string, documentSelector: string | string[]): Disposable {
	const serverOptions: ServerOptions = { command };
	const clientOptions: LanguageClientOptions = { documentSelector	};
	const ls = new LanguageClient(command, serverOptions, clientOptions);

	// Files extensions
	ls.onRequest(FilesRequest.type, FilesRequest.handler);
	ls.onRequest(ContentRequest.type, ContentRequest.handler);

	return ls.start();
}

function startLangServerTCP(addr: number, documentSelector: string | string[]): Disposable {
	const serverOptions: ServerOptions = function() {
		return new Promise((resolve, reject) => {
			const client = new net.Socket();
			client.connect(addr, "127.0.0.1", () => {
				resolve({
					reader: client,
					writer: client
				});
			});
		});
	}

	const clientOptions: LanguageClientOptions = { documentSelector };
	return new LanguageClient(`tcp lang server (port ${addr})`, serverOptions, clientOptions).start();
}

export function activate(context: ExtensionContext) {
	context.subscriptions.push(startLangServer("langserver-sample", ["plaintext"]));
	context.subscriptions.push(startLangServer("langserver-go", ["go"]));
	context.subscriptions.push(startLangServer("langserver-python", ["python"]));
	context.subscriptions.push(startLangServer("langserver-ctags", ["php"]));
	// When developing JS/TS, set {"typescript.tsdk": "/dev/null"} in your user settings in the
	// new VSCode window opened via `npm run vscode`.
	context.subscriptions.push(startLangServerTCP(2089, ["typescript", "typescriptreact", "javascript", "javascriptreact"]));
	context.subscriptions.push(startLangServerTCP(2088, ["java"]));
}

