import { useState, useEffect, useRef, useMemo } from 'preact/hooks'
import './App.css'
import { LoadNote, SaveNote, SaveImage, GetImageBase64 } from '../wailsjs/go/main/App'
import { EditorView, keymap, Decoration, DecorationSet, WidgetType, ViewPlugin, ViewUpdate } from '@codemirror/view'
import { EditorState, RangeSetBuilder } from '@codemirror/state'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { oneDark } from '@codemirror/theme-one-dark'
import { search, openSearchPanel, closeSearchPanel } from '@codemirror/search'
import { history, historyKeymap } from '@codemirror/commands'

// ============ TODO Types and Logic ============

type TodoType = 'reminder' | 'todo' | 'deadline' | 'defer'

interface TodoItem {
    type: TodoType
    date: Date
    text: string
    line: number
    position: number
    priority: number
    rawMatch: string
}

// Parse howm-style TODO: [YYYY-MM-DD]+ [YYYY-MM-DD]- [YYYY-MM-DD]! [YYYY-MM-DD]~
// Excludes completed items: [YYYY-MM-DD]. [YYYY-MM-DD]:+ ...
function parseTodos(content: string): TodoItem[] {
    const todos: TodoItem[] = []
    // Match active TODOs but not completed ones (which have ". [date]:" after the first date)
    const regex = /\[(\d{4}-\d{2}-\d{2})\]([+\-!~])(?!\s*\[)\s*(.+)/g
    let match
    let position = 0

    const lines = content.split('\n')
    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
        const line = lines[lineNum]
        regex.lastIndex = 0
        while ((match = regex.exec(line)) !== null) {
            const dateStr = match[1]
            const typeChar = match[2]
            const text = match[3].trim()
            const date = new Date(dateStr)

            let type: TodoType
            switch (typeChar) {
                case '-': type = 'reminder'; break
                case '+': type = 'todo'; break
                case '!': type = 'deadline'; break
                case '~': type = 'defer'; break
                default: type = 'todo'
            }

            todos.push({
                type,
                date,
                text,
                line: lineNum,
                position: position + match.index,
                priority: 0,
                rawMatch: match[0]
            })
        }
        position += line.length + 1
    }

    return todos
}

// Calculate priority using howm-style floating/sinking
function calculatePriority(todo: TodoItem, now: Date): number {
    const msPerDay = 24 * 60 * 60 * 1000
    const daysDiff = (now.getTime() - todo.date.getTime()) / msPerDay

    switch (todo.type) {
        case 'reminder':
            // Sinks after date: priority decreases as days pass
            if (daysDiff < 0) return 1000 // Future: high priority
            return Math.max(0, 1000 - daysDiff * 50) // Sinks gradually

        case 'todo':
            // Floats after date: priority increases as days pass
            if (daysDiff < 0) return 100 // Future: low priority
            return 100 + daysDiff * 100 // Floats up

        case 'deadline':
            // Floats until date: priority increases as deadline approaches
            if (daysDiff > 0) return -1000 // Past deadline: sink to bottom (done or overdue)
            return 2000 + daysDiff * 100 // Approaches: higher priority

        case 'defer':
            // Periodic: use sine wave for float/sink cycle (7-day period)
            const cycle = Math.sin((daysDiff / 7) * Math.PI * 2)
            return 500 + cycle * 300

        default:
            return 0
    }
}

function sortTodosByPriority(todos: TodoItem[], now: Date): TodoItem[] {
    return todos
        .map(todo => ({ ...todo, priority: calculatePriority(todo, now) }))
        .sort((a, b) => b.priority - a.priority)
}

// Get type symbol for display
function getTypeSymbol(type: TodoType): string {
    switch (type) {
        case 'reminder': return '-'
        case 'todo': return '+'
        case 'deadline': return '!'
        case 'defer': return '~'
    }
}

// Get type label for display
function getTypeLabel(type: TodoType): string {
    switch (type) {
        case 'reminder': return 'reminder'
        case 'todo': return 'TODO'
        case 'deadline': return 'DEADLINE'
        case 'defer': return 'defer'
    }
}

// ============ Image Widget ============

class ImageWidget extends WidgetType {
    constructor(readonly src: string) {
        super()
    }

    toDOM() {
        const container = document.createElement('div')
        container.className = 'cm-image-preview'
        const img = document.createElement('img')
        img.src = this.src
        img.style.maxWidth = '100%'
        img.style.maxHeight = '300px'
        img.style.display = 'block'
        img.style.margin = '8px 0'
        img.style.borderRadius = '4px'
        container.appendChild(img)
        return container
    }

    eq(other: ImageWidget) {
        return other.src === this.src
    }
}

const imageCache = new Map<string, string>()

function buildImageDecorations(view: EditorView): DecorationSet {
    const builder = new RangeSetBuilder<Decoration>()
    const doc = view.state.doc.toString()
    const regex = /!\[([^\]]*)\]\((images\/[^)]+)\)/g
    let match

    while ((match = regex.exec(doc)) !== null) {
        const imagePath = match[2]
        const lineEnd = doc.indexOf('\n', match.index)
        const pos = lineEnd === -1 ? doc.length : lineEnd

        const cachedData = imageCache.get(imagePath)
        if (cachedData) {
            const widget = Decoration.widget({
                widget: new ImageWidget(`data:image/png;base64,${cachedData}`),
                side: 1
            })
            builder.add(pos, pos, widget)
        } else {
            GetImageBase64(imagePath).then((base64) => {
                imageCache.set(imagePath, base64)
                view.dispatch({})
            }).catch(() => {})
        }
    }

    return builder.finish()
}

const imagePreviewPlugin = ViewPlugin.fromClass(
    class {
        decorations: DecorationSet
        constructor(view: EditorView) {
            this.decorations = buildImageDecorations(view)
        }
        update(update: ViewUpdate) {
            if (update.docChanged || update.viewportChanged) {
                this.decorations = buildImageDecorations(update.view)
            }
        }
    },
    { decorations: (v) => v.decorations }
)

// ============ Completed TODO Strikethrough ============

const completedTodoMark = Decoration.mark({ class: 'cm-completed-todo' })

function buildCompletedTodoDecorations(view: EditorView): DecorationSet {
    const builder = new RangeSetBuilder<Decoration>()
    const doc = view.state.doc.toString()
    // Match completed TODOs: [YYYY-MM-DD]. [YYYY-MM-DD]:X ...
    const regex = /\[\d{4}-\d{2}-\d{2}\]\.\s*\[\d{4}-\d{2}-\d{2}\]:[+\-!~]\s*.+/g
    let match

    while ((match = regex.exec(doc)) !== null) {
        builder.add(match.index, match.index + match[0].length, completedTodoMark)
    }

    return builder.finish()
}

const completedTodoPlugin = ViewPlugin.fromClass(
    class {
        decorations: DecorationSet
        constructor(view: EditorView) {
            this.decorations = buildCompletedTodoDecorations(view)
        }
        update(update: ViewUpdate) {
            if (update.docChanged) {
                this.decorations = buildCompletedTodoDecorations(update.view)
            }
        }
    },
    { decorations: (v) => v.decorations }
)

// ============ TODO Pane Component ============

interface TodoPaneProps {
    todos: TodoItem[]
    onTodoClick: (todo: TodoItem) => void
}

function TodoPane({ todos, onTodoClick }: TodoPaneProps) {
    const now = new Date()

    const formatDate = (date: Date) => {
        const diff = Math.floor((date.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
        if (diff === 0) return 'Today'
        if (diff === 1) return 'Tomorrow'
        if (diff === -1) return 'Yesterday'
        return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
    }

    const getUrgencyClass = (todo: TodoItem) => {
        const msPerDay = 24 * 60 * 60 * 1000
        const daysDiff = (todo.date.getTime() - now.getTime()) / msPerDay

        if (todo.type === 'deadline') {
            if (daysDiff < 0) return 'overdue'
            if (daysDiff < 1) return 'urgent'
            if (daysDiff < 3) return 'soon'
        }
        if (todo.type === 'todo' && daysDiff < -7) return 'stale'
        return ''
    }

    return (
        <div class="todo-pane">
            <div class="todo-pane-header">
                <span>TODO</span>
                <span class="todo-count">{todos.length}</span>
            </div>
            <div class="todo-list">
                {todos.map((todo, i) => (
                    <div
                        key={i}
                        class={`todo-item ${todo.type} ${getUrgencyClass(todo)}`}
                        onClick={() => onTodoClick(todo)}
                    >
                        <span class="todo-type">[{getTypeSymbol(todo.type)}]</span>
                        <span class="todo-date">{formatDate(todo.date)}</span>
                        <span class="todo-text">{todo.text}</span>
                    </div>
                ))}
                {todos.length === 0 && (
                    <div class="todo-empty">No TODOs</div>
                )}
            </div>
            <div class="todo-pane-footer">
                <div class="todo-legend">
                    <span><code>+</code> todo</span>
                    <span><code>!</code> deadline</span>
                    <span><code>-</code> reminder</span>
                    <span><code>~</code> defer</span>
                </div>
            </div>
        </div>
    )
}

// ============ Main App ============

function App() {
    const [content, setContent] = useState('')
    const [lastSavedContent, setLastSavedContent] = useState('')
    const [isLoaded, setIsLoaded] = useState(false)
    const [showTodoPane, setShowTodoPane] = useState(false)
    const editorContainerRef = useRef<HTMLDivElement>(null)
    const editorViewRef = useRef<EditorView | null>(null)

    // Parse and sort TODOs
    const sortedTodos = useMemo(() => {
        const todos = parseTodos(content)
        return sortTodosByPriority(todos, new Date())
    }, [content])

    // Load note on mount
    useEffect(() => {
        LoadNote().then((note: string) => {
            setContent(note)
            setLastSavedContent(note)
            setIsLoaded(true)
        })
    }, [])

    // Initialize CodeMirror
    useEffect(() => {
        if (!isLoaded || !editorContainerRef.current || editorViewRef.current) return

        const updateListener = EditorView.updateListener.of((update) => {
            if (update.docChanged) {
                const newContent = update.state.doc.toString()
                setContent(newContent)
            }
        })

        const customKeymap = keymap.of([
            {
                key: 'Mod-n',
                run: (view) => {
                    addNewEntry(view)
                    return true
                }
            },
            {
                key: 'Mod-f',
                run: (view) => {
                    openSearchPanel(view)
                    return true
                }
            },
            {
                key: 'Mod-t',
                run: (view) => {
                    insertTodo(view)
                    return true
                }
            },
            {
                key: 'Mod-Shift-t',
                run: () => {
                    setShowTodoPane(prev => !prev)
                    return true
                }
            },
            {
                key: 'Enter',
                run: (view) => {
                    // Check if cursor is on a TODO symbol and cycle it
                    if (cycleTodoSymbol(view)) {
                        return true
                    }
                    return false // Let default Enter behavior happen
                }
            },
            {
                key: '.',
                run: (view) => {
                    // Check if cursor is on a TODO symbol and complete it
                    if (completeTodo(view)) {
                        return true
                    }
                    return false // Let default "." input happen
                }
            },
            {
                key: 'Escape',
                run: (view) => {
                    closeSearchPanel(view)
                    return true
                }
            }
        ])

        const pasteHandler = EditorView.domEventHandlers({
            paste: (event, view) => {
                const clipboardData = event.clipboardData
                if (!clipboardData) return false

                const items = clipboardData.items
                for (let i = 0; i < items.length; i++) {
                    const item = items[i]
                    if (item.type.startsWith('image/')) {
                        event.preventDefault()
                        const file = item.getAsFile()
                        if (file) {
                            const reader = new FileReader()
                            reader.onload = async () => {
                                const base64 = (reader.result as string).split(',')[1]
                                try {
                                    const imagePath = await SaveImage(base64)
                                    const markdownImage = `![](${imagePath})`
                                    const pos = view.state.selection.main.head
                                    view.dispatch({
                                        changes: { from: pos, insert: markdownImage + '\n' },
                                        selection: { anchor: pos + markdownImage.length + 1 }
                                    })
                                } catch (err) {
                                    console.error('Failed to save image:', err)
                                }
                            }
                            reader.readAsDataURL(file)
                        }
                        return true
                    }
                }
                return false
            }
        })

        const theme = EditorView.theme({
            '&': {
                height: '100%',
                fontSize: '14px'
            },
            '.cm-scroller': {
                fontFamily: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace',
                lineHeight: '1.6'
            },
            '.cm-content': {
                padding: '20px'
            },
            '.cm-gutters': {
                display: 'none'
            },
            '.cm-image-preview': {
                padding: '4px 0'
            }
        })

        const state = EditorState.create({
            doc: content,
            extensions: [
                customKeymap,
                keymap.of(historyKeymap),
                pasteHandler,
                markdown({
                    base: markdownLanguage,
                    codeLanguages: languages
                }),
                oneDark,
                theme,
                search(),
                history(),
                updateListener,
                imagePreviewPlugin,
                completedTodoPlugin,
                EditorView.lineWrapping
            ]
        })

        const view = new EditorView({
            state,
            parent: editorContainerRef.current
        })

        editorViewRef.current = view

        return () => {
            view.destroy()
            editorViewRef.current = null
        }
    }, [isLoaded])

    // Auto-save every second
    useEffect(() => {
        const interval = setInterval(() => {
            if (content !== lastSavedContent) {
                SaveNote(content).then(() => {
                    setLastSavedContent(content)
                })
            }
        }, 1000)
        return () => clearInterval(interval)
    }, [content, lastSavedContent])

    const insertTodo = (view: EditorView) => {
        const now = new Date()
        const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
        const todoText = `[${dateStr}]+ `
        const pos = view.state.selection.main.head

        // Insert TODO and position cursor on the '+' symbol
        view.dispatch({
            changes: { from: pos, insert: todoText },
            selection: { anchor: pos + dateStr.length + 2 } // Position on '+'
        })
    }

    const cycleTodoSymbol = (view: EditorView): boolean => {
        const pos = view.state.selection.main.head
        const doc = view.state.doc.toString()

        // Check if cursor is on a TODO symbol (+, -, !, ~)
        const char = doc[pos]
        const symbols = ['+', '!', '-', '~']
        const currentIndex = symbols.indexOf(char)

        if (currentIndex === -1) return false

        // Check if it's part of a TODO pattern [YYYY-MM-DD]X
        const before = doc.substring(Math.max(0, pos - 12), pos)
        if (!/\[\d{4}-\d{2}-\d{2}\]$/.test(before)) return false

        // Cycle to next symbol
        const nextSymbol = symbols[(currentIndex + 1) % symbols.length]
        view.dispatch({
            changes: { from: pos, to: pos + 1, insert: nextSymbol },
            selection: { anchor: pos }
        })
        return true
    }

    const completeTodo = (view: EditorView): boolean => {
        const pos = view.state.selection.main.head
        const doc = view.state.doc.toString()

        // Check if cursor is on a TODO symbol (+, -, !, ~)
        const char = doc[pos]
        const symbols = ['+', '!', '-', '~']
        if (!symbols.includes(char)) return false

        // Check if it's part of a TODO pattern [YYYY-MM-DD]X
        const beforeMatch = doc.substring(Math.max(0, pos - 12), pos)
        const dateMatch = beforeMatch.match(/\[(\d{4}-\d{2}-\d{2})\]$/)
        if (!dateMatch) return false

        // Get today's date for completion timestamp
        const now = new Date()
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

        // Transform: [2026-01-17]+ task → [2026-01-17]. [2026-01-17]:+ task
        // The symbol at pos becomes "." and we insert completion date + original symbol
        const completionInsert = `. [${todayStr}]:${char}`

        view.dispatch({
            changes: { from: pos, to: pos + 1, insert: completionInsert },
            selection: { anchor: pos } // Stay on the "."
        })
        return true
    }

    const addNewEntry = (view: EditorView) => {
        const now = new Date()
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
        const dayStr = days[now.getDay()]
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

        const dateHeader = `# ${dateStr} (${dayStr})`
        const timeHeader = `## ${timeStr}`

        const currentContent = view.state.doc.toString()
        let newContent: string
        let cursorPosition: number

        if (currentContent.includes(dateHeader)) {
            const dateIndex = currentContent.indexOf(dateHeader)
            const nextDateIndex = currentContent.indexOf('\n# ', dateIndex + 1)

            if (nextDateIndex === -1) {
                newContent = currentContent.trimEnd() + '\n\n' + timeHeader + '\n\n'
                cursorPosition = newContent.length
            } else {
                const beforeNext = currentContent.substring(0, nextDateIndex).trimEnd()
                const afterNext = currentContent.substring(nextDateIndex)
                newContent = beforeNext + '\n\n' + timeHeader + '\n\n' + afterNext
                cursorPosition = beforeNext.length + timeHeader.length + 4
            }
        } else {
            newContent = dateHeader + '\n\n' + timeHeader + '\n\n' + currentContent
            cursorPosition = dateHeader.length + timeHeader.length + 4
        }

        view.dispatch({
            changes: { from: 0, to: currentContent.length, insert: newContent },
            selection: { anchor: cursorPosition }
        })
    }

    const handleTodoClick = (todo: TodoItem) => {
        const view = editorViewRef.current
        if (!view) return

        // Jump to the TODO position
        view.dispatch({
            selection: { anchor: todo.position },
            scrollIntoView: true
        })
        view.focus()
    }

    return (
        <div id="App" class={showTodoPane ? 'with-todo-pane' : ''}>
            {showTodoPane && (
                <TodoPane todos={sortedTodos} onTodoClick={handleTodoClick} />
            )}
            <div ref={editorContainerRef} class="editor-container" />
        </div>
    )
}

export default App
