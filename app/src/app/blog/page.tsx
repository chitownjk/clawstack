import { getAllPosts } from '@/lib/blog'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Blog | Tiker',
  description: 'Thoughts on AI coordination, productivity, and building tools that actually work for real people.',
}

export default function BlogPage() {
  const posts = getAllPosts()

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
            <Link href="/blog" className="text-gray-900 dark:text-white font-medium">
              Blog
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-12">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
            Blog
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Thoughts on AI coordination, productivity, and building tools that actually work for real people.
          </p>
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              First post coming soon.
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {posts.map((post) => (
              <article key={post.slug} className="group">
                <Link href={`/blog/${post.slug}`} className="block">
                  <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mb-2">
                    <time dateTime={post.date}>
                      {new Date(post.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </time>
                    <span className="text-gray-300 dark:text-gray-600">/</span>
                    <span>{post.readingTime}</span>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-2">
                    {post.title}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    {post.excerpt}
                  </p>
                  {post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
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
                </Link>
              </article>
            ))}
          </div>
        )}
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
