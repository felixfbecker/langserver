package main

import "testing"

func TestPython_hover(t *testing.T) {
	runHoverTests("python", "stdio", &pythonTestData, t)
}

func TestPython_definition(t *testing.T) {
	runDefinitionTests("python", "stdio", &pythonTestData, t)
}

func TestPython_references(t *testing.T) {
	runReferencesTests("python", "stdio", &pythonTestData, t)
}
