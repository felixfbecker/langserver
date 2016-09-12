package main

import "sourcegraph.com/sourcegraph/sourcegraph/pkg/lsp"

type testCase struct {
	Repo            string
	HoverCases      []hoverCase
	DefinitionCases []definitionCase
	ReferencesCases []referencesCase
}

type hoverCase struct {
	File      string
	Line      int
	Character int
	Resp      lsp.Hover
}

func (hc *hoverCase) ToRequestParams() *lsp.TextDocumentPositionParams {
	return &lsp.TextDocumentPositionParams{
		TextDocument: lsp.TextDocumentIdentifier{URI: hc.File},
		Position:     lsp.Position{Line: hc.Line, Character: hc.Character},
	}
}

type definitionCase struct {
	File      string
	Line      int
	Character int
	Resp      []lsp.Location
}

func (dc *definitionCase) ToRequestParams() *lsp.TextDocumentPositionParams {
	return &lsp.TextDocumentPositionParams{
		TextDocument: lsp.TextDocumentIdentifier{URI: dc.File},
		Position:     lsp.Position{Line: dc.Line, Character: dc.Character},
	}
}

type referencesCase struct {
	File      string
	Line      int
	Character int
	Resp      []lsp.Location
}

func (rc *referencesCase) ToRequestParams() *lsp.TextDocumentPositionParams {
	return &lsp.TextDocumentPositionParams{
		TextDocument: lsp.TextDocumentIdentifier{URI: rc.File},
		Position:     lsp.Position{Line: rc.Line, Character: rc.Character},
	}
}
