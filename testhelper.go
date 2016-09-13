package main

import (
	"fmt"
	"os"
	"os/exec"
	"testing"

	"sourcegraph.com/sourcegraph/sourcegraph/pkg/lsp"
)

func initTest(lang, mode string, tc *testCase) (*lspConn, *exec.Cmd, error) {
	cmd, ok := langServerCmds[lang]
	if !ok {
		return nil, nil, fmt.Errorf("no command found for lang %s", lang)
	}

	var c *lspConn
	var e *exec.Cmd
	var err error

	switch mode {
	case "stdio":
		c, e, err = newStdioClient(cmd)
	case "tcp":
		c, err = newTCPClient("2088")
	default:
		return nil, nil, fmt.Errorf("invalid mode %s", mode)
	}

	dir, err := os.Getwd()
	if err != nil {
		c.Close()
		e.Process.Kill()
		return nil, nil, err
	}

	err = c.Initialize(dir + "/test_repos/" + tc.Repo)
	if err != nil {
		c.Close()
		e.Process.Kill()
		return nil, nil, err
	}

	return c, e, nil
}

func runHoverTests(lang, mode string, tc *testCase, t *testing.T) {
	c, e, err := initTest(lang, mode, tc)
	if err != nil {
		t.Error(err)
	}

	defer c.Shutdown()
	defer c.Close()
	if e != nil {
		defer e.Process.Kill()
	}

	for i, hc := range tc.HoverCases {
		resp, err := c.Hover(hc.ToRequestParams())
		if err != nil {
			t.Errorf("Error returned for hover (case #%d): %v", i, err)
		}
		checkHoverResponse(i, &hc.Resp, resp, t)
	}
}

func checkHoverResponse(i int, expected *lsp.Hover, got *lsp.Hover, t *testing.T) {
	if expected.Range != got.Range {
		t.Errorf("Range (case #%d): expected %v got %v", i, expected.Range, got.Range)
	}
	if len(expected.Contents) != len(got.Contents) {
		t.Errorf("len(Contents) (case #%d): expected %d got %d", i, len(expected.Contents), len(got.Contents))
	}
	for j, c := range got.Contents {
		e := expected.Contents[j]
		if e != c {
			t.Errorf("Content[%d] (case #%d): expected %v got %v", j, i, e, c)
		}
	}
}

func runDefinitionTests(lang, mode string, tc *testCase, t *testing.T) {
	c, e, err := initTest(lang, mode, tc)
	if err != nil {
		t.Error(err)
	}

	defer c.Shutdown()
	defer c.Close()
	if e != nil {
		defer e.Process.Kill()
	}

	for i, dc := range tc.DefinitionCases {
		resp, err := c.Definition(dc.ToRequestParams())
		if err != nil {
			t.Errorf("Error returned for definition (case #%d): %v", i, err)
		}
		checkLocationResponse(i, &dc.Resp, resp, t)
	}
}

func runReferencesTests(lang, mode string, tc *testCase, t *testing.T) {
	c, e, err := initTest(lang, mode, tc)
	if err != nil {
		t.Error(err)
	}

	defer c.Shutdown()
	defer c.Close()
	if e != nil {
		defer e.Process.Kill()
	}

	for i, rc := range tc.ReferencesCases {
		resp, err := c.References(rc.ToRequestParams())
		if err != nil {
			t.Errorf("Error returned for definition (case #%d): %v", i, err)
		}
		checkLocationResponse(i, &rc.Resp, resp, t)
	}
}

func checkLocationResponse(i int, expected *[]lsp.Location, got *[]lsp.Location, t *testing.T) {
	if len(*expected) != len(*got) {
		t.Errorf("len(Location) (case #%d): expected %d got %d", i, len(*expected), len(*got))
	}
	for j, l := range *got {
		e := (*expected)[j]
		if l != e {
			t.Errorf("Location[%d] (case #%d): expected %v got %v", j, i, e, l)
		}
	}
}
