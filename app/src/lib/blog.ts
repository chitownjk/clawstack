import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { remark } from 'remark'
import remarkGfm from 'remark-gfm'
import remarkHtml from 'remark-html'
import readingTime from 'reading-time'

export interface BlogPost {
  slug: string
  title: string
  date: string
  excerpt: string
  author: string
  tags: string[]
  coverImage?: string
  content: string
  readingTime: string
  published: boolean
}

export interface BlogPostMeta {
  slug: string
  title: string
  date: string
  excerpt: string
  author: string
  tags: string[]
  coverImage?: string
  readingTime: string
}

const BLOG_DIR = path.join(process.cwd(), '..', 'content', 'blog')

function getBlogDir(): string {
  // Handle both dev (app/) and build contexts
  if (fs.existsSync(BLOG_DIR)) return BLOG_DIR
  const altDir = path.join(process.cwd(), 'content', 'blog')
  if (fs.existsSync(altDir)) return altDir
  // Fallback: create the directory
  fs.mkdirSync(BLOG_DIR, { recursive: true })
  return BLOG_DIR
}

export function getAllPosts(): BlogPostMeta[] {
  const dir = getBlogDir()
  if (!fs.existsSync(dir)) return []

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'))

  const posts = files.map(filename => {
    const slug = filename.replace(/\.md$/, '')
    const filePath = path.join(dir, filename)
    const fileContents = fs.readFileSync(filePath, 'utf8')
    const { data, content } = matter(fileContents)

    if (data.published === false) return null

    const stats = readingTime(content)

    return {
      slug,
      title: data.title || slug,
      date: data.date || '',
      excerpt: data.excerpt || content.slice(0, 160).replace(/[#*_\n]/g, '').trim() + '...',
      author: data.author || 'Tiker Team',
      tags: data.tags || [],
      coverImage: data.coverImage || undefined,
      readingTime: stats.text,
    } as BlogPostMeta
  }).filter(Boolean) as BlogPostMeta[]

  // Sort by date, newest first
  return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const dir = getBlogDir()
  const filePath = path.join(dir, `${slug}.md`)

  if (!fs.existsSync(filePath)) return null

  const fileContents = fs.readFileSync(filePath, 'utf8')
  const { data, content } = matter(fileContents)

  if (data.published === false) return null

  const processedContent = await remark()
    .use(remarkGfm)
    .use(remarkHtml, { sanitize: false })
    .process(content)

  const stats = readingTime(content)

  return {
    slug,
    title: data.title || slug,
    date: data.date || '',
    excerpt: data.excerpt || content.slice(0, 160).replace(/[#*_\n]/g, '').trim() + '...',
    author: data.author || 'Tiker Team',
    tags: data.tags || [],
    coverImage: data.coverImage || undefined,
    content: processedContent.toString(),
    readingTime: stats.text,
    published: data.published !== false,
  }
}

export function getAllSlugs(): string[] {
  const dir = getBlogDir()
  if (!fs.existsSync(dir)) return []

  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .map(f => f.replace(/\.md$/, ''))
}
