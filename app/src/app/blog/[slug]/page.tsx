import { getPostBySlug, getAllSlugs } from '@/lib/blog'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return getAllSlugs().map(slug => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = await getPostBySlug(slug)
  if (!post) return { title: 'Post Not Found | Tiker' }

  return {
    title: `${post.title} | Tiker Blog`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.date,
      authors: [post.author],
      tags: post.tags,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
    },
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = await getPostBySlug(slug)

  if (!post) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-3xl mx-auto px-6 py-6 flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            Tiker
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
              Home
            </Link>
            <Link href="/pricing" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
              Pricing
            </Link>
            <Link href="/blog" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
              Blog
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16">
        {/* Back link */}
        <Link
          href="/blog"
          className="inline-flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-8"
        >
          &larr; All posts
        </Link>

        <article>
          {/* Post header */}
          <header className="mb-10">
            <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mb-4">
              <time dateTime={post.date}>
                {new Date(post.date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </time>
              <span className="text-gray-300 dark:text-gray-600">/</span>
              <span>{post.readingTime}</span>
              <span className="text-gray-300 dark:text-gray-600">/</span>
              <span>{post.author}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white leading-tight">
              {post.title}
            </h1>
            {post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {post.tags.map(tag => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </header>

          {/* Post content */}
          <div
            className="prose prose-gray dark:prose-invert max-w-none
              prose-headings:font-semibold
              prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
              prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
              prose-p:leading-relaxed prose-p:text-gray-700 dark:prose-p:text-gray-300
              prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
              prose-code:text-sm prose-code:bg-gray-100 dark:prose-code:bg-gray-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
              prose-pre:bg-gray-950 dark:prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-200 dark:prose-pre:border-gray-700
              prose-blockquote:border-blue-500 prose-blockquote:text-gray-600 dark:prose-blockquote:text-gray-400
              prose-img:rounded-lg prose-img:shadow-md
              prose-li:text-gray-700 dark:prose-li:text-gray-300"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </article>

        {/* Post footer */}
        <div className="mt-16 pt-8 border-t border-gray-200 dark:border-gray-800">
          <Link
            href="/blog"
            className="inline-flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            &larr; Back to all posts
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 mt-20">
        <div className="max-w-3xl mx-auto px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>&copy; {new Date().getFullYear()} Tiker. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
