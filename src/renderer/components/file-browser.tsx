import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, File, Folder } from 'lucide-react'

import { cn } from '@/lib/utils'

interface FileBrowserProps {
  requestId: string
  files: string[]
}

interface TreeNode {
  name: string
  path: string
  file: boolean
  children: TreeNode[]
}

// Builds the folder tree from the flat list of package files. Folders come first, then files, both sorted by name.
export function buildTree(files: string[]): TreeNode[] {
  const root: TreeNode = { name: '', path: '', file: false, children: [] }
  for (const file of files) {
    const parts = file.split('/')
    let node = root
    parts.forEach((part, index) => {
      const path = parts.slice(0, index + 1).join('/')
      let child = node.children.find((candidate) => candidate.name === part)
      if (!child) {
        child = { name: part, path, file: index === parts.length - 1, children: [] }
        node.children.push(child)
      }
      node = child
    })
  }
  sortTree(root.children)
  return root.children
}

function sortTree(nodes: TreeNode[]): void {
  nodes.sort((a, b) => (a.file === b.file ? a.name.localeCompare(b.name) : a.file ? 1 : -1))
  for (const node of nodes) sortTree(node.children)
}

// The files of a review in a folder tree, with the selected file's contents beside it.
export function FileBrowser({ requestId, files }: FileBrowserProps) {
  const tree = useMemo(() => buildTree(files), [files])
  const [selected, setSelected] = useState<string | null>(null)
  const [contents, setContents] = useState<string | null>(null)
  const [open, setOpen] = useState<Set<string>>(() => new Set(files.flatMap(folderPaths)))

  useEffect(() => {
    const initial = files.includes('manifest.json') ? 'manifest.json' : files[0] ?? null
    setSelected(initial)
  }, [files])

  useEffect(() => {
    if (!selected) return
    let current = true
    setContents(null)
    void window.workplace.generation.file(requestId, selected).then((text) => {
      if (current) setContents(text ?? 'This file could not be read.')
    })
    return () => {
      current = false
    }
  }, [requestId, selected])

  function toggle(path: string) {
    setOpen((current) => {
      const next = new Set(current)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  return (
    <div className="flex h-full min-h-0">
      <nav aria-label="Package files" className="w-60 shrink-0 overflow-y-auto border-r p-2 text-sm">
        {files.length === 0 && <p className="px-2 py-1 text-muted-foreground">No files yet</p>}
        <Tree nodes={tree} depth={0} open={open} selected={selected} onToggle={toggle} onSelect={setSelected} />
      </nav>
      <div className="min-w-0 flex-1 overflow-auto">
        {selected ? (
          <>
            <p className="sticky top-0 border-b bg-background px-4 py-2 font-mono text-xs text-muted-foreground">
              {selected}
            </p>
            <pre className="p-4 text-xs leading-relaxed">{contents ?? 'Loading…'}</pre>
          </>
        ) : (
          <p className="p-4 text-sm text-muted-foreground">Select a file to see its contents.</p>
        )}
      </div>
    </div>
  )
}

interface TreeProps {
  nodes: TreeNode[]
  depth: number
  open: Set<string>
  selected: string | null
  onToggle: (path: string) => void
  onSelect: (path: string) => void
}

function Tree({ nodes, depth, open, selected, onToggle, onSelect }: TreeProps) {
  return (
    <ul className="space-y-0.5">
      {nodes.map((node) =>
        node.file ? (
          <li key={node.path}>
            <button
              type="button"
              onClick={() => onSelect(node.path)}
              aria-current={node.path === selected ? 'true' : undefined}
              style={{ paddingLeft: 8 + depth * 14 }}
              className={cn(
                'flex w-full items-center gap-2 rounded-md py-1 pr-2 text-left',
                node.path === selected ? 'bg-primary/15 font-medium' : 'hover:bg-accent',
              )}
            >
              <File className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="truncate">{node.name}</span>
            </button>
          </li>
        ) : (
          <li key={node.path}>
            <button
              type="button"
              onClick={() => onToggle(node.path)}
              aria-expanded={open.has(node.path)}
              style={{ paddingLeft: 8 + depth * 14 }}
              className="flex w-full items-center gap-2 rounded-md py-1 pr-2 text-left hover:bg-accent"
            >
              {open.has(node.path) ? (
                <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              ) : (
                <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              )}
              <Folder className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="truncate">{node.name}</span>
            </button>
            {open.has(node.path) && (
              <Tree
                nodes={node.children}
                depth={depth + 1}
                open={open}
                selected={selected}
                onToggle={onToggle}
                onSelect={onSelect}
              />
            )}
          </li>
        ),
      )}
    </ul>
  )
}

// Every folder above a file, so the tree opens with all its files visible.
function folderPaths(file: string): string[] {
  const parts = file.split('/')
  return parts.slice(0, -1).map((_, index) => parts.slice(0, index + 1).join('/'))
}
