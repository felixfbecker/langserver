package main

import "sourcegraph.com/sourcegraph/sourcegraph/pkg/lsp"

var pythonTestData = testCase{
	Repo: "github.com/jkbrzt/httpie",
	HoverCases: []hoverCase{
		hoverCase{
			File:      "httpie/cli.py",
			Line:      25,
			Character: 8,
			Resp: lsp.Hover{
				Contents: []lsp.MarkedString{
					lsp.MarkedString{
						Language: "text/plain",
						Value: `HTTPieArgumentParser(self, *args, **kwargs)

Adds additional logic to ` + "`argparse.ArgumentParser`" + `.

Handles all input (CLI args, file args, stdin), applies defaults,
and performs extra validation.
`,
					},
				},
			},
		},
	},
	DefinitionCases: []definitionCase{
		definitionCase{
			File:      "httpie/cli.py",
			Line:      37,
			Character: 20,
			Resp: []lsp.Location{
				lsp.Location{
					URI: "file:///Users/rothfels/go/src/github.com/sourcegraph/langserver/test_repos/github.com/jkbrzt/httpie/httpie/cli.py", // TODO: use workspace-relative path
					Range: lsp.Range{
						Start: lsp.Position{
							Line:      25,
							Character: 6,
						},
						End: lsp.Position{
							Line:      25, // TODO: should be range of entire function body
							Character: 6,  // TODO: should be range of entire function body
						},
					},
				},
			},
		},
	},
	ReferencesCases: []referencesCase{
		referencesCase{
			File:      "httpie/cli.py",
			Line:      37,
			Character: 20,
			Resp: []lsp.Location{
				// TODO: this should include the declaration; it doesn't.
				lsp.Location{
					URI: "file:///Users/rothfels/go/src/github.com/sourcegraph/langserver/test_repos/github.com/jkbrzt/httpie/httpie/cli.py", // TODO: use workspace-relative path
					Range: lsp.Range{
						Start: lsp.Position{
							Line:      37,
							Character: 14,
						},
						End: lsp.Position{
							Line:      37, // TODO: should be range of entire function body
							Character: 14, // TODO: should be range of entire function body
						},
					},
				},
				lsp.Location{
					URI: "file:///Users/rothfels/go/src/github.com/sourcegraph/langserver/test_repos/github.com/jkbrzt/httpie/httpie/cli.py", // TODO: use workspace-relative path
					Range: lsp.Range{
						Start: lsp.Position{
							Line:      44,
							Character: 20,
						},
						End: lsp.Position{
							Line:      44, // TODO: should be range of entire function body
							Character: 20, // TODO: should be range of entire function body
						},
					},
				},
			},
		},
	},
}
