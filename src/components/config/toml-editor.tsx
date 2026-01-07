import { useEffect } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { linter, Diagnostic } from '@codemirror/lint'
import { oneDark } from '@codemirror/theme-one-dark'
import { parse } from 'smol-toml'

interface TomlEditorProps {
  value: string
  onChange: (value: string) => void
  onError?: (error: string | null) => void
  readonly?: boolean
}

export function TomlEditor({ value, onChange, onError, readonly = false }: TomlEditorProps) {
  // 创建 TOML linter
  const tomlLinter = linter((view) => {
    const content = view.state.doc.toString()
    try {
      parse(content)
      onError?.(null)
      return []
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      onError?.(message)
      return [{
        from: 0,
        to: content.length,
        severity: 'error',
        message: `TOML 语法错误: ${message}`
      }] satisfies Diagnostic[]
    }
  })

  // 初始化时验证一次
  useEffect(() => {
    try {
      parse(value)
      onError?.(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      onError?.(message)
    }
  }, [value, onError])

  return (
    <CodeMirror
      value={value}
      height="100%"
      theme={oneDark}
      editable={!readonly}
      onChange={onChange}
      extensions={[tomlLinter]}
      basicSetup={{
        lineNumbers: true,
        highlightActiveLineGutter: true,
        highlightSpecialChars: true,
        foldGutter: true,
        drawSelection: true,
        dropCursor: true,
        allowMultipleSelections: true,
        indentOnInput: true,
        bracketMatching: true,
        closeBrackets: true,
        autocompletion: true,
        rectangularSelection: true,
        crosshairCursor: true,
        highlightActiveLine: true,
        highlightSelectionMatches: true,
        closeBracketsKeymap: true,
        searchKeymap: true,
        foldKeymap: true,
        completionKeymap: true,
        lintKeymap: true,
      }}
    />
  )
}
