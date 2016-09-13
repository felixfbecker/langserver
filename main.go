package main

import (
	"bufio"
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"

	"sourcegraph.com/sourcegraph/sourcegraph/pkg/jsonrpc2"
	"sourcegraph.com/sourcegraph/sourcegraph/pkg/lsp"
)

var (
	mode           = flag.String("mode", "stdio", "communication mode (stdio|tcp)")
	addr           = flag.String("addr", ":2088", "server listen address (tcp)")
	rootPath       = flag.String("root", "", "workspace root path")
	ctx            = context.Background()
	stdin          = bufio.NewReader(os.Stdin)
	langServerCmds = map[string]string{
		"go":     "langserver-go",
		"python": "langserver-python",
		"sample": "langserver-sample",
	}
)

type lspConn struct {
	*jsonrpc2.Conn
}

func (c *lspConn) Initialize(rootPath string) error {
	return c.Call(ctx, "initialize", &lsp.InitializeParams{RootPath: rootPath}, nil)
}

func (c *lspConn) Definition(p *lsp.TextDocumentPositionParams) (*[]lsp.Location, error) {
	var locResp []lsp.Location
	err := c.Call(ctx, "textDocument/definition", p, &locResp)
	if err != nil {
		return nil, err
	}
	return &locResp, nil
}

func (c *lspConn) Hover(p *lsp.TextDocumentPositionParams) (*lsp.Hover, error) {
	var hoverResp lsp.Hover
	err := c.Call(ctx, "textDocument/hover", p, &hoverResp)
	if err != nil {
		return nil, err
	}
	return &hoverResp, nil
}

func (c *lspConn) References(p *lsp.TextDocumentPositionParams) (*[]lsp.Location, error) {
	rp := lsp.ReferenceParams{
		TextDocumentPositionParams: *p,
		Context: lsp.ReferenceContext{
			IncludeDeclaration: true,
		},
	}
	var refsResp []lsp.Location
	err := c.Call(ctx, "textDocument/references", rp, &refsResp)
	if err != nil {
		return nil, err
	}
	return &refsResp, nil
}

func (c *lspConn) Shutdown() error {
	return c.Call(ctx, "shutdown", nil, nil)
}

func main() {
	flag.Parse()
	log.SetFlags(0)

	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func newTCPClient(addr string) (*lspConn, error) {
	if addr == "" {
		return nil, fmt.Errorf("provide a command and addr to create a lang server tcp client")
	}

	conn, err := net.Dial("tcp", addr)
	if err != nil {
		return nil, err
	}
	return &lspConn{jsonrpc2.NewConn(ctx, conn, nil)}, nil
}

type stdrwc struct {
	Stdin  io.WriteCloser
	Stdout io.ReadCloser
}

func (v stdrwc) Read(p []byte) (int, error) {
	return v.Stdout.Read(p)
}

func (v stdrwc) Write(p []byte) (int, error) {
	return v.Stdin.Write(p)
}

func (v stdrwc) Close() error {
	if err := v.Stdin.Close(); err != nil {
		return err
	}
	return v.Stdout.Close()
}

func newStdioClient(cmd string) (*lspConn, *exec.Cmd, error) {
	subProcess := exec.Command(cmd)

	stdin, err := subProcess.StdinPipe()
	if err != nil {
		return nil, nil, err
	}
	stdout, err := subProcess.StdoutPipe()
	if err != nil {
		return nil, nil, err
	}
	if err = subProcess.Start(); err != nil {
		return nil, nil, err
	}

	s := stdrwc{
		Stdin:  stdin,
		Stdout: stdout,
	}
	return &lspConn{jsonrpc2.NewConn(ctx, s, nil)}, subProcess, nil
}

func run() error {
	if *rootPath == "" {
		return fmt.Errorf("specify a workspace root")
	}

	cmd := os.Args[len(os.Args)-1]

	var c *lspConn
	var e *exec.Cmd
	var err error

	switch *mode {
	case "tcp":
		c, err = newTCPClient(*addr)

	case "stdio":
		c, e, err = newStdioClient(cmd)

	default:
		return fmt.Errorf("invalid mode (tcp|stdio): %s", *mode)
	}

	if err != nil {
		return err
	}

	defer c.Close()
	if e != nil {
		defer e.Process.Kill()
	}

	err = c.Initialize(*rootPath)
	if err != nil {
		return err
	}

	for {
		method := promptMethod()
		if method == "" {
			continue
		}
		if method == "shutdown" {
			break
		}

		file := promptFile()
		if file == "" || filepath.IsAbs(file) {
			continue
		}

		line := promptLine()
		char := promptCharacter()

		p := lsp.TextDocumentPositionParams{
			TextDocument: lsp.TextDocumentIdentifier{URI: file},
			Position:     lsp.Position{Line: line, Character: char},
		}

		printResponse := func(resp interface{}, err error) {
			if err != nil {
				fmt.Println("ERROR: ", err)
			}
			j, _ := json.MarshalIndent(resp, "", "\t")
			fmt.Printf("\n\n%v\n\n\n", string(j))
		}

		switch method {
		case "hover":
			resp, err := c.Hover(&p)
			printResponse(resp, err)

		case "definition":
			resp, err := c.Definition(&p)
			printResponse(resp, err)

		case "references":
			resp, err := c.References(&p)
			printResponse(resp, err)

		default:
			continue
		}
	}

	err = c.Shutdown()
	if err != nil {
		return err
	}

	return nil
}

func promptString(prompt string) string {
	fmt.Print(prompt)
	var text string
	fmt.Scanln(&text)
	return text
}

func promptInt(prompt string) int {
	for {
		i, err := strconv.Atoi(promptString(prompt))
		if err == nil {
			return i
		}
	}
}

func promptMethod() string {
	switch promptString("Choose (1) hover, (2) definition, (3) references, (4) shutdown: ") {
	case "1":
		return "hover"
	case "2":
		return "definition"
	case "3":
		return "references"
	case "4":
		return "shutdown"
	default:
		return ""
	}
}

func promptFile() string {
	return promptString("Choose a file path relative to root: ")
}

func promptLine() int {
	return promptInt("Choose a 0-indexed line: ")
}

func promptCharacter() int {
	return promptInt("Choose a 0-indexed character offset for that line: ")
}
