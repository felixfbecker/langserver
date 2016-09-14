/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as net from 'net';

import { workspace, Disposable, ExtensionContext } from 'vscode';
import { LanguageClient, LanguageClientOptions, SettingMonitor, ServerOptions, ErrorAction, ErrorHandler, CloseAction, TransportKind } from 'vscode-languageclient';

function startLangServer(command: string, documentSelector: string | string[]): Disposable {
	const serverOptions: ServerOptions = {
		command: command,
	};
	const clientOptions: LanguageClientOptions = {
		documentSelector: documentSelector,
	}
	return new LanguageClient(command, serverOptions, clientOptions).start();
}

function startLangServerTCP(addr: number, documentSelector: string | string[]): Disposable {
	const serverOptions: ServerOptions = function() {
		return new Promise((resolve, reject) => {
			var client = new net.Socket();
			client.connect(addr, "127.0.0.1", function() {
				resolve({
					reader: client,
					writer: client
				});
			});
		});
	}

	const clientOptions: LanguageClientOptions = {
		documentSelector: documentSelector,
	}
	return new LanguageClient(`tcp lang server (port ${addr})`, serverOptions, clientOptions).start();
}

export function activate(context: ExtensionContext) {
	context.subscriptions.push(startLangServer("sample_server", ["plaintext"]));
	context.subscriptions.push(startLangServer("langserver-go", ["go"]));
	context.subscriptions.push(startLangServer("langserver-python", ["python"]));
	context.subscriptions.push(startLangServer("langserver-ctags", ["php"]));
	context.subscriptions.push(startLangServerTCP(2088, ["typescript", "javascript"])); // when developing, also set {"typescript.tsdk": "/dev/null"} in your user/workspace settings
	context.subscriptions.push(startLangServerTCP(2088, ["java"]));
}

