"""Pytest configuration and fixtures."""

import pytest
from pathlib import Path


@pytest.fixture
def sample_python_file(tmp_path):
    """Create a sample Python file for testing."""
    content = '''
import os
from pathlib import Path

class MyClass:
    """A sample class."""
    
    def __init__(self, name: str):
        self.name = name
    
    def greet(self) -> str:
        return f"Hello, {self.name}!"

def main():
    obj = MyClass("World")
    print(obj.greet())

if __name__ == "__main__":
    main()
'''
    file_path = tmp_path / "sample.py"
    file_path.write_text(content)
    return file_path


@pytest.fixture
def sample_typescript_file(tmp_path):
    """Create a sample TypeScript file for testing."""
    content = '''
import React from 'react';
import { useState } from 'react';

interface Props {
    name: string;
    age: number;
}

export function greet(name: string): string {
    return `Hello, ${name}!`;
}

export class Greeter {
    constructor(private name: string) {}
    
    greet(): string {
        return `Hello, ${this.name}!`;
    }
}
'''
    file_path = tmp_path / "sample.ts"
    file_path.write_text(content)
    return file_path


@pytest.fixture
def sample_directory(tmp_path):
    """Create a sample directory structure for testing."""
    # Create files
    (tmp_path / "main.py").write_text("import os\nprint('hello')")
    (tmp_path / "utils.py").write_text("def helper(): pass")
    
    subdir = tmp_path / "subdir"
    subdir.mkdir()
    (subdir / "module.py").write_text("class Module: pass")
    
    return tmp_path
