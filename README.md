# Language server extensions for Visual Studio Code

A language server is responsible for statically analyzing source code, usually for a single language,
and providing answers to the following questions:

* given a location (a character offset in a file), what is the "hover tooltip" (summarizing the entity at that location)?
* given a location, what is the corresponding "jump-to-def" location (where the entity is declared)?
* given a location, what are all the locations where the entity at that location is referenced (including its declaration)?

To answer these questions, a language server must implement a subset of the
[Microsoft Language Server Protocol](https://github.com/Microsoft/language-server-protocol) (LSP).

## Required Methods

The method subset of LSP which must be implemented includes:

* [`initialize`](https://github.com/Microsoft/language-server-protocol/blob/master/protocol.md#initialize-request)
* [`textDocument/definition`](https://github.com/Microsoft/language-server-protocol/blob/master/protocol.md#goto-definition-request)
* [`textDocument/hover`](https://github.com/Microsoft/language-server-protocol/blob/master/protocol.md#hover-request)
* [`textDocument/references`](https://github.com/Microsoft/language-server-protocol/blob/master/protocol.md#find-references-request)
* [`shutdown`](https://github.com/Microsoft/language-server-protocol/blob/master/protocol.md#shutdown-request)

## Definitions

1. A **workspace** is a directory tree containing source code files (rooted at the `rootPath` specified in the `initialize` request)
2. **language server** (or **LS**) is the generic name of a backend implementing LSP (or the subset shown above)
3. **LSP** is the name of the [protocol defined by Microsoft](https://github.com/Microsoft/language-server-protocol) for
clients to communicate with language servers

## Getting Started

- [Install Go](https://golang.org/doc/install) and [set up your workspace for Go development](https://golang.org/doc/code.html).
- Install the existing Go language server:
```bash
go get -u github.com/sourcegraph/langserver-go
```
- Verify the Go language server works with your installation of VSCode:
```bash
cd vscode-client
npm install
npm run vscode -- $GOPATH/src/github.com/sourcegraph/langserver-go
```
- Write a server that you can hook up via stdio using vscode-client and prints a static string
as a response for any hover interaction, and verify it works in VSCode
- Properly implement hover (and other methods) and continue testing against VSCode.

## Development

You will write a program which speaks LSP over stdin and stdout (and/or runs a TCP listener and speaks LSP over the socket).

You should test your language server using [VSCode](https://code.visualstudio.com/) as a reference client.
To wire your language server to VSCode, follow the [vscode-client README](https://github.com/sourcegraph/langserver/blob/master/vscode-client/README.md).

## Testing

This project provides two tools to help you test your language server:

- a REPL to make requests over stdio or TCP to your language server
- an automated test harness (written in Go)

### REPL

```bash
go install ./lspcli
lspcli --root=/path/to/repo --mode=tcp # connect to a language server over TCP port 2088
lspcli --root=/path/to/repo --mode=tcp --addr=4444 # port 4444
lspcli --root=/path/to/repo --cmd=langserver-python # spawn a subprocess and communicate over stdio
```

### Test Harness

This project provides an automated test harness in Go which you may use to test your language server.
A reference implementation is provided for [`langserver-go`](https://github.com/sourcegraph/langserver-go/blob/master/go_test.go)
and [`langserver-python`](https://github.com/sourcegraph/langserver-python/blob/master/python_test.go).

## Delivering

Deliver your language server with CI running a suite of test cases for hover, definition, and references requests
against sample repositories of your choice.

In addition, provide some additional information about your language server characteristics in the README:

- what are the memory requirements for sample (small/medium/large) workspaces?
- what is the delay after the first call to `initialize` to answer `hover`, `definition`, and `references` requests?
- does the above metric change on subsequent requests to `initialize` workspaces (after they have been `shutdown`)?

Aim to meet these performance benchmarks:

- <500ms P95 latency for `definition` & `hover` requests
- <10s P95 latency for `references` request

## Extending

- [`workspace/symbol`](https://github.com/Microsoft/language-server-protocol/blob/master/protocol.md#workspace-symbols-request)
    - this method should returning the repository's top-level identifiers for an empty query
- *global namespace*
    - for your particular language, choose a URI scheme which allows global namespacing of top-level identifiers
    - it should be constructed by joining symbol's `containerName` and `name` properties
- make `textDocument/definition` support jumping to "external" definitions
    - e.g. by jumping to vendored dependencies, returning a value from the *global namespace*, or returning query
    parameters to run against the *global namespace*d defs.
