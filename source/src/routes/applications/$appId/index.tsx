import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import { api, APPS_BASE } from '../../../api'
import { marked } from 'marked'
import hljs from 'highlight.js/lib/core'
import rust from 'highlight.js/lib/languages/rust'
import typescript from 'highlight.js/lib/languages/typescript'
import javascript from 'highlight.js/lib/languages/javascript'
import css from 'highlight.js/lib/languages/css'
import xml from 'highlight.js/lib/languages/xml'
import json from 'highlight.js/lib/languages/json'
import yaml from 'highlight.js/lib/languages/yaml'
import ini from 'highlight.js/lib/languages/ini'
import markdown from 'highlight.js/lib/languages/markdown'
import bash from 'highlight.js/lib/languages/bash'
import python from 'highlight.js/lib/languages/python'
import go from 'highlight.js/lib/languages/go'
import sql from 'highlight.js/lib/languages/sql'
import graphql from 'highlight.js/lib/languages/graphql'
import plaintext from 'highlight.js/lib/languages/plaintext'

hljs.registerLanguage('rust', rust)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('css', css)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('json', json)
hljs.registerLanguage('yaml', yaml)
hljs.registerLanguage('ini', ini)
hljs.registerLanguage('markdown', markdown)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('python', python)
hljs.registerLanguage('go', go)
hljs.registerLanguage('sql', sql)
hljs.registerLanguage('graphql', graphql)
hljs.registerLanguage('plaintext', plaintext)

const parentRoute = getRouteApi('/applications/$appId')

export const Route = createFileRoute('/applications/$appId/')({
  component: CodePage,
})

interface DirEntry {
  name: string
  type: 'file' | 'directory'
  size: number
}

interface DirResponse {
  app: string
  path: string
  type: 'directory'
  entries: DirEntry[]
}

interface FileResponse {
  app: string
  path: string
  type: 'file'
  content: string
  size: number
}

function extToLanguage(filename: string): string | undefined {
  const ext = filename.split('.').pop()?.toLowerCase()
  const map: Record<string, string> = {
    rs: 'rust', ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    css: 'css', html: 'xml', htm: 'xml', xml: 'xml', svg: 'xml',
    json: 'json', yaml: 'yaml', yml: 'yaml', toml: 'ini',
    md: 'markdown', sh: 'bash', bash: 'bash', zsh: 'bash',
    py: 'python', rb: 'ruby', go: 'go', java: 'java',
    sql: 'sql', graphql: 'graphql', gql: 'graphql',
    txt: 'plaintext', log: 'plaintext', lock: 'plaintext',
  }
  return ext ? map[ext] : undefined
}

function flattenTree(
  entries: DirEntry[],
  parentPath: string,
  expandedDirs: Set<string>,
  allEntries: Map<string, DirEntry[]>,
): { path: string; entry: DirEntry; depth: number }[] {
  const result: { path: string; entry: DirEntry; depth: number }[] = []
  const depth = parentPath === '/' ? 0 : parentPath.split('/').filter(Boolean).length
  for (const e of entries) {
    const fullPath = parentPath === '/' ? `/${e.name}` : `${parentPath}/${e.name}`
    result.push({ path: fullPath, entry: e, depth })
    if (e.type === 'directory' && expandedDirs.has(fullPath)) {
      const children = allEntries.get(fullPath)
      if (children) {
        result.push(...flattenTree(children, fullPath, expandedDirs, allEntries))
      }
    }
  }
  return result
}

function CodePage() {
  const { appId } = Route.useParams()
  const { detail } = parentRoute.useLoaderData()
  const appName = detail?.config?.name || appId

  const [allEntries, setAllEntries] = useState<Map<string, DirEntry[]>>(new Map())
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set())
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchDir = useCallback(async (path: string) => {
    try {
      const res = await api<DirResponse>(`${APPS_BASE}/files?app=${encodeURIComponent(appId)}&path=${encodeURIComponent(path)}`)
      setAllEntries(prev => {
        const next = new Map(prev)
        next.set(path, res.entries)
        return next
      })
      return res.entries
    } catch {
      return []
    }
  }, [appId])

  useEffect(() => {
    fetchDir('/').then(entries => {
      const readme = entries.find(e => e.type === 'file' && e.name.toLowerCase() === 'readme.md')
      if (readme && !selectedFile) {
        selectFile(`/${readme.name}`)
      }
    })
  }, [fetchDir]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleDir = useCallback(async (path: string) => {
    setExpandedDirs(prev => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
    if (!allEntries.has(path)) {
      await fetchDir(path)
    }
  }, [allEntries, fetchDir])

  const selectFile = useCallback(async (path: string) => {
    setSelectedFile(path)
    setLoading(true)
    try {
      const res = await api<FileResponse>(`${APPS_BASE}/files?app=${encodeURIComponent(appId)}&path=${encodeURIComponent(path)}`)
      setFileContent(res.content)
    } catch {
      setFileContent('// Failed to load file')
    } finally {
      setLoading(false)
    }
  }, [appId])

  const rootEntries = allEntries.get('/') || []
  const flatItems = flattenTree(rootEntries, '/', expandedDirs, allEntries)

  const fileName = selectedFile?.split('/').pop() || ''
  const lang = extToLanguage(fileName)
  const isMarkdown = lang === 'markdown'
  let rendered = ''
  if (fileContent != null) {
    if (isMarkdown) {
      rendered = marked.parse(fileContent, { async: false }) as string
    } else {
      try {
        rendered = lang
          ? hljs.highlight(fileContent, { language: lang }).value
          : hljs.highlightAuto(fileContent).value
      } catch {
        rendered = fileContent.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      }
    }
  }

  return (
    <div className="detail-body-layout">
      <nav className="db-nav">
        <div className="panel-header">
          <span className="panel-title">{appName}</span>
        </div>
        {flatItems.map(({ path, entry, depth }) => (
          <div
            key={path}
            className={`db-nav-item${entry.type === 'file' && path === selectedFile ? ' active' : ''}`}
            style={{ paddingLeft: `${(depth + 1) * 16}px` }}
            onClick={() => entry.type === 'directory' ? toggleDir(path) : selectFile(path)}
          >
            <span>{entry.type === 'directory' ? (expandedDirs.has(path) ? '▾ ' : '▸ ') : ''}{entry.name}</span>
          </div>
        ))}
        {rootEntries.length === 0 && (
          <div className="db-nav-empty">No files</div>
        )}
      </nav>
      <div className="detail-content">
        {selectedFile ? (
          <div className="code-browser">
            <div className="panel-header">
              <span className="panel-title">{selectedFile}</span>
              {lang && <span className="panel-badge">{lang}</span>}
            </div>
            {isMarkdown && !loading ? (
              <div className="markdown-content" dangerouslySetInnerHTML={{ __html: rendered }} />
            ) : (
              <pre className="code-browser-content hljs">
                {loading ? (
                  <code>Loading...</code>
                ) : (
                  <code dangerouslySetInnerHTML={{ __html: rendered }} />
                )}
              </pre>
            )}
          </div>
        ) : (
          <div className="empty-state">Select a file to view</div>
        )}
      </div>
    </div>
  )
}
