
// Monkey-patched version of the vscode-languageclient to allow custom ClientCapabilities

import { LanguageClient as VSCodeLanguageClient } from 'vscode-languageclient';

import {
  workspace as Workspace, window as Window, languages as Languages, extensions as Extensions, commands as Commands,
  TextDocumentChangeEvent, TextDocument, Disposable, OutputChannel,
  FileSystemWatcher, Uri, DiagnosticCollection, DocumentSelector as VDocumentSelector,
  CancellationToken, Hover as VHover, Position as VPosition, Location as VLocation, Range as VRange,
  CompletionItem as VCompletionItem, CompletionList as VCompletionList, SignatureHelp as VSignatureHelp, Definition as VDefinition, DocumentHighlight as VDocumentHighlight,
  SymbolInformation as VSymbolInformation, CodeActionContext as VCodeActionContext, Command as VCommand, CodeLens as VCodeLens,
  FormattingOptions as VFormattingOptions, TextEdit as VTextEdit, WorkspaceEdit as VWorkspaceEdit, MessageItem,
  DocumentLink as VDocumentLink, TextDocumentWillSaveEvent, TextDocumentSaveReason as VTextDocumentSaveReason
} from 'vscode';

import {
  Message, MessageType as RPCMessageType, MessageConnection, Logger, createMessageConnection, ErrorCodes, ResponseError,
  RequestType, RequestType0, RequestType1, RequestType2, RequestType3, RequestType4,
  RequestType5, RequestType6, RequestType7, RequestType8, RequestType9,
  RequestHandler, RequestHandler0, RequestHandler1, RequestHandler2, RequestHandler3,
  RequestHandler4, RequestHandler5, RequestHandler6, RequestHandler7, RequestHandler8,
  RequestHandler9, GenericRequestHandler,
  NotificationType, NotificationType0, NotificationType1, NotificationType2, NotificationType3,
  NotificationType4, NotificationType5, NotificationType6, NotificationType7, NotificationType8,
  NotificationType9,
  NotificationHandler, NotificationHandler0, NotificationHandler1, NotificationHandler2,
  NotificationHandler3, NotificationHandler4, NotificationHandler5, NotificationHandler6,
  NotificationHandler7, NotificationHandler8, NotificationHandler9, GenericNotificationHandler,
  MessageReader, IPCMessageReader, MessageWriter, IPCMessageWriter, Trace, Tracer, Event, Emitter
} from 'vscode-jsonrpc';

import { Delayer } from 'vscode-languageclient/lib/utils/async'
import * as is from 'vscode-languageclient/lib/utils/is';

import {
  RegistrationRequest, Registration, RegistrationParams, UnregistrationRequest, Unregistration, UnregistrationParams, DocumentOptions,
  InitializeRequest, InitializeParams, InitializeResult, InitializeError, ClientCapabilities, ServerCapabilities, TextDocumentSyncKind,
  InitializedNotification, InitializedParams, ShutdownRequest, ExitNotification,
  LogMessageNotification, LogMessageParams, MessageType,
  ShowMessageNotification, ShowMessageParams, ShowMessageRequest, ShowMessageRequestParams,
  TelemetryEventNotification,
  DidChangeConfigurationNotification, DidChangeConfigurationParams,
  TextDocumentPositionParams, DocumentSelector, DocumentFilter,
  DidOpenTextDocumentNotification, DidOpenTextDocumentParams,
  DidChangeTextDocumentNotification, DidChangeTextDocumentParams, DidChangeTextDocumentOptions,
  DidCloseTextDocumentNotification, DidCloseTextDocumentParams,
  DidSaveTextDocumentNotification, DidSaveTextDocumentParams, SaveOptions,
  WillSaveTextDocumentNotification, WillSaveTextDocumentWaitUntilRequest, WillSaveTextDocumentParams,
  DidChangeWatchedFilesNotification, DidChangeWatchedFilesParams, FileEvent, FileChangeType,
  PublishDiagnosticsNotification, PublishDiagnosticsParams,
  CompletionRequest, CompletionResolveRequest, CompletionOptions,
  HoverRequest,
  SignatureHelpRequest, SignatureHelpOptions, DefinitionRequest, ReferencesRequest, DocumentHighlightRequest,
  DocumentSymbolRequest, WorkspaceSymbolRequest,
  CodeActionRequest, CodeActionParams,
  CodeLensRequest, CodeLensResolveRequest, CodeLensOptions,
  DocumentFormattingRequest, DocumentFormattingParams, DocumentRangeFormattingRequest, DocumentRangeFormattingParams,
  DocumentOnTypeFormattingRequest, DocumentOnTypeFormattingParams, DocumentOnTypeFormattingOptions,
  RenameRequest, RenameParams,
  DocumentLinkRequest, DocumentLinkResolveRequest, DocumentLinkParams, DocumentLinkOptions,
  ExecuteCommandRequest, ExecuteCommandParams, ExecuteCommandResponse, ExecuteCommandOptions,
  ApplyWorkspaceEditRequest, ApplyWorkspaceEditParams, ApplyWorkspaceEditResponse
} from 'vscode-languageclient/lib/protocol';

import { FilesExtensionClientCapabilities } from './protocol-extension-files';

enum ClientState {
  Initial,
  Starting,
  StartFailed,
  Running,
  Stopping,
  Stopped
}

interface IConnection {

  listen(): void;

  sendRequest<R, E, RO>(type: RequestType0<R, E, RO>, token?: CancellationToken): Thenable<R>;
  sendRequest<P, R, E, RO>(type: RequestType<P, R, E, RO>, params: P, token?: CancellationToken): Thenable<R>;
  sendRequest<R>(method: string, token?: CancellationToken): Thenable<R>;
  sendRequest<R>(method: string, param: any, token?: CancellationToken): Thenable<R>;
  sendRequest<R>(type: string | RPCMessageType, ...params: any[]): Thenable<R>;

  onRequest<R, E, RO>(type: RequestType0<R, E, RO>, handler: RequestHandler0<R, E>): void;
  onRequest<P, R, E, RO>(type: RequestType<P, R, E, RO>, handler: RequestHandler<P, R, E>): void;
  onRequest<R, E>(method: string, handler: GenericRequestHandler<R, E>): void;
  onRequest<R, E>(method: string | RPCMessageType, handler: GenericRequestHandler<R, E>): void;

  sendNotification<RO>(type: NotificationType0<RO>): void;
  sendNotification<P, RO>(type: NotificationType<P, RO>, params?: P): void;
  sendNotification(method: string): void;
  sendNotification(method: string, params: any): void;
  sendNotification(method: string | RPCMessageType, params?: any): void;

  onNotification<RO>(type: NotificationType0<RO>, handler: NotificationHandler0): void;
  onNotification<P, RO>(type: NotificationType<P, RO>, handler: NotificationHandler<P>): void;
  onNotification(method: string, handler: GenericNotificationHandler): void;
  onNotification(method: string | RPCMessageType, handler: GenericNotificationHandler): void;

  trace(value: Trace, tracer: Tracer, sendNotification?: boolean): void;

  initialize(params: InitializeParams): Thenable<InitializeResult>;
  shutdown(): Thenable<void>;
  exit(): void;

  onLogMessage(handle: NotificationHandler<LogMessageParams>): void;
  onShowMessage(handler: NotificationHandler<ShowMessageParams>): void;
  onTelemetry(handler: NotificationHandler<any>): void;

  didChangeConfiguration(params: DidChangeConfigurationParams): void;
  didChangeWatchedFiles(params: DidChangeWatchedFilesParams): void;

  didOpenTextDocument(params: DidOpenTextDocumentParams): void;
  didChangeTextDocument(params: DidChangeTextDocumentParams): void;
  didCloseTextDocument(params: DidCloseTextDocumentParams): void;
  didSaveTextDocument(params: DidSaveTextDocumentParams): void;
  onDiagnostics(handler: NotificationHandler<PublishDiagnosticsParams>): void;

  dispose(): void;
}

interface ExtendedInitializeParams extends InitializeParams {
  capabilities: ClientCapabilities & FilesExtensionClientCapabilities;
}

export class LanguageClient extends VSCodeLanguageClient { }

(<any>LanguageClient).initialize = function initialize(this: any, connection: IConnection): Thenable<InitializeResult> {
  this.refreshTrace(connection, false);
  let initOption = this._clientOptions.initializationOptions;
  let initParams: ExtendedInitializeParams = {
    processId: process.pid,
    rootPath: Workspace.rootPath,
    capabilities: {
      xfilesProvider: true,
      xcontentProvider: true
    },
    initializationOptions: is.func(initOption) ? initOption() : initOption,
    trace: Trace.toString(this._trace)
  };
  return connection.initialize(initParams).then((result: any) => {
    this.state = ClientState.Running;
    this._capabilites = result.capabilities;
    connection.onDiagnostics(params => this.handleDiagnostics(params));
    if (this._capabilites.textDocumentSync !== TextDocumentSyncKind.None) {
      Workspace.onDidOpenTextDocument(t => this.onDidOpenTextDoument(connection, t), null, this._listeners);
      Workspace.onDidChangeTextDocument(t => this.onDidChangeTextDocument(connection, t), null, this._listeners);
      Workspace.onDidCloseTextDocument(t => this.onDidCloseTextDoument(connection, t), null, this._listeners);
      Workspace.onDidSaveTextDocument(t => this.onDidSaveTextDocument(connection, t), null, this._listeners);
      if (this._capabilites.textDocumentSync === TextDocumentSyncKind.Full) {
        this._documentSyncDelayer = new Delayer<void>(100);
      }
    }
    this.hookFileEvents(connection);
    this.hookConfigurationChanged(connection);
    connection.onRequest(RegistrationRequest.type, params => this.handleRegistrationRequest(params));
    connection.onRequest(UnregistrationRequest.type, params => this.handleUnregistrationRequest(params));
    this.hookCapabilities(connection);
    connection.sendNotification(InitializedNotification.type, {});
    this._onReadyCallbacks.resolve();
    Workspace.textDocuments.forEach(t => this.onDidOpenTextDoument(connection, t));
    return result;
  }, (error: any) => {
    if (this._clientOptions.initializationFailedHandler) {
      if (this._clientOptions.initializationFailedHandler(error)) {
        this.initialize(connection);
      } else {
        this.stop();
        this._onReadyCallbacks.reject(error);
      }
    } else if (error instanceof ResponseError && error.data && error.data.retry) {
      Window.showErrorMessage(error.message, { title: 'Retry', id: "retry" }).then(item => {
        if (is.defined(item) && item.id === 'retry') {
          this.initialize(connection);
        } else {
          this.stop();
          this._onReadyCallbacks.reject(error);
        }
      });
    } else {
      if (error && error.message) {
        Window.showErrorMessage(error.message);
      }
      this.error('Server initialization failed.', error);
      this.stop();
      this._onReadyCallbacks.reject(error);
    }
  });
}
