# LSP Language Server

A language server is responsible for statically analyzing source code, usually for a single language,
and providing answers to the following questions:

* given a location (a character offset in a file), what is the "hover tooltip" (summarizing the entity at that location)?
* given a location, what is the corresponding "jump-to-def" location (where the entity is declared)?
* given a location, what are all the locations where the entity at that location is referenced (including its declaration)?

In answering these questions, the language server is expected to implement a subset of the
[Microsoft Language Server Protocol](https://github.com/Microsoft/language-server-protocol) (LSP).

## Required Methods

The method subset of LSP which must be implemented includes:

* [`initialize`](https://github.com/Microsoft/language-server-protocol/blob/master/protocol.md#initialize-request)
* [`textDocument/definition`](https://github.com/Microsoft/language-server-protocol/blob/master/protocol.md#goto-definition-request)
* [`textDocument/hover`](https://github.com/Microsoft/language-server-protocol/blob/master/protocol.md#hover-request)
* [`textDocument/references`](https://github.com/Microsoft/language-server-protocol/blob/master/protocol.md#find-references-request)
* [`shutdown`](https://github.com/Microsoft/language-server-protocol/blob/master/protocol.md#shutdown-request)

## Definitions

1. A **workspace** is a git repository at a particular revision (commit SHA); the repository sources are located at
the `rootPath` specified in the `initialize` request
2. **language server** (or **LS**) is the generic name of a backend implementing LSP (or the subset shown above)
3. **LSP** is the name of the [protocol defined by Microsoft](https://github.com/Microsoft/language-server-protocol) for
clients to communicate with language servers

## Getting Started

- [Install Go](https://golang.org/doc/install) and [set up your workspace for Go development](https://golang.org/doc/code.html).
- `go get -u github.com/sourcegraph/langserver`
- `cd $GOPATH/github.com/sourcegraph/langserver`
- `go test $(go list ./... | grep -v /vendor/ | grep $LANGUAGE)`

Note: very little knowledge of Go beyond what's shown above is required.

## Development

Write a program which speaks LSP over stdin and stdout (and/or runs a TCP listener and speaks LSP over the socket).

You should test your language server using [VSCode](https://code.visualstudio.com/) as a reference client.
To wire your language server to VSCode, follow the [vscode-client README](https://github.com/sourcegraph/langserver/blob/master/vscode-client/README.md).

## Testing

This project provides two tools for testing your language server:

- a REPL to make requests over stdio or TCP to your language server
- an automated test harness

### REPL

Assuming you ran `go install github.com/sourcegraph/langserver`, use the installed `langserver` command
to enter a REPL where you can make requests to a language server:

```bash
langserver --root=/path/to/repo --mode=tcp # connect to a language server over TCP port 2088
langserver --root=/path/to/repo --mode=tcp --addr=4444 # port 4444
langserver --root=/path/to/repo python # spawn a subprocess and communicate over stdio
```

### Test Harness

This project also provides an automated test harness which you should hook up to your language server.
A reference implementation is provided in [`python.go`](https://github.com/sourcegraph/langserver/blob/master/python.go)
and [`python_test.go`](https://github.com/sourcegraph/langserver/blob/master/python_test.go) (which expects you have installed
[`langserver-python`](https://github.com/sourcegraph/langserver-python/) in your `$PATH`. The langserver
command per language is registered at the top of of [`main.go`](https://github.com/sourcegraph/langserver/blob/master/main.go).

You may use this project to test your language server in CI by running the subset of tests for
your language, e.g. in a `circle.yml` or `travis.yml`:

```bash
# get test harness and test data, which you check into this repository
go get github.com/sourcegraph/langserver

# install your language server, e.g.
go get github.com/sourcegraph/langserver-python
# and other environment setup...

# run tests
cd $GOPATH/github.com/sourcegraph/langserver
export LANGUAGE=python
go test $(go list ./... | grep -v /vendor/ | grep $LANGUAGE)
```

## Delivering

In addition to the language server sources, provide some additional information about its characteristics:

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
