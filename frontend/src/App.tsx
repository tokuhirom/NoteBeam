import { useState, useEffect, useRef } from 'preact/hooks'
import './App.css'
import { LoadNote, SaveNote, SaveImage, GetImageBase64 } from '../wailsjs/go/main/App'
import { EditorView, keymap, Decoration, DecorationSet, WidgetType, ViewPlugin, ViewUpdate } from '@codemirror/view'
import { EditorState, RangeSetBuilder } from '@codemirror/state'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { oneDark } from '@codemirror/theme-one-dark'
import { search, openSearchPanel, closeSearchPanel } from '@codemirror/search'

// Image widget for inline preview
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

// Cache for image base64 data
const imageCache = new Map<string, string>()

// Function to build image decorations
function buildImageDecorations(view: EditorView): DecorationSet {
    const builder = new RangeSetBuilder<Decoration>()
    const doc = view.state.doc.toString()
    const regex = /!\[([^\]]*)\]\((images\/[^)]+)\)/g
    let match

    while ((match = regex.exec(doc)) !== null) {
        const imagePath = match[2]
        const lineEnd = doc.indexOf('\n', match.index)
        const pos = lineEnd === -1 ? doc.length : lineEnd

        // Check if we have cached base64 data
        const cachedData = imageCache.get(imagePath)
        if (cachedData) {
            const widget = Decoration.widget({
                widget: new ImageWidget(`data:image/png;base64,${cachedData}`),
                side: 1
            })
            builder.add(pos, pos, widget)
        } else {
            // Load image asynchronously
            GetImageBase64(imagePath).then((base64) => {
                imageCache.set(imagePath, base64)
                // Trigger a re-render by dispatching an empty transaction
                view.dispatch({})
            }).catch(() => {
                // Image not found, ignore
            })
        }
    }

    return builder.finish()
}

// View plugin for image preview
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
    {
        decorations: (v) => v.decorations
    }
)

function App() {
    const [content, setContent] = useState('')
    const [lastSavedContent, setLastSavedContent] = useState('')
    const [isLoaded, setIsLoaded] = useState(false)
    const editorContainerRef = useRef<HTMLDivElement>(null)
    const editorViewRef = useRef<EditorView | null>(null)

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
                key: 'Escape',
                run: (view) => {
                    closeSearchPanel(view)
                    return true
                }
            }
        ])

        // Handle paste event for images
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
                pasteHandler,
                markdown({
                    base: markdownLanguage,
                    codeLanguages: languages
                }),
                oneDark,
                theme,
                search(),
                updateListener,
                imagePreviewPlugin,
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

    // Auto-save every second when content changes
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
            // Today's date exists - find the section and add time entry at the end
            const dateIndex = currentContent.indexOf(dateHeader)
            const nextDateIndex = currentContent.indexOf('\n# ', dateIndex + 1)

            if (nextDateIndex === -1) {
                // No next date, append at the end
                newContent = currentContent.trimEnd() + '\n\n' + timeHeader + '\n\n'
                cursorPosition = newContent.length
            } else {
                // Insert before the next date
                const beforeNext = currentContent.substring(0, nextDateIndex).trimEnd()
                const afterNext = currentContent.substring(nextDateIndex)
                newContent = beforeNext + '\n\n' + timeHeader + '\n\n' + afterNext
                cursorPosition = beforeNext.length + timeHeader.length + 4
            }
        } else {
            // Today's date doesn't exist - add at the beginning
            newContent = dateHeader + '\n\n' + timeHeader + '\n\n' + currentContent
            cursorPosition = dateHeader.length + timeHeader.length + 4
        }

        view.dispatch({
            changes: { from: 0, to: currentContent.length, insert: newContent },
            selection: { anchor: cursorPosition }
        })
    }

    return (
        <div id="App">
            <div ref={editorContainerRef} class="editor-container" />
        </div>
    )
}

export default App
