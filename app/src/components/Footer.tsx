import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 mt-auto">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          {/* Product */}
          <div>
            <h4 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Product</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/command" className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition">
                  Command
                </Link>
              </li>
              <li>
                <Link href="/hub" className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition">
                  Agents
                </Link>
              </li>
              <li>
                <Link href="/use-cases" className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition">
                  Use Cases
                </Link>
              </li>
              <li>
                <Link href="/#pricing" className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Services</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/services" className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition">
                  All Services
                </Link>
              </li>
              <li>
                <Link href="/services#remote-setup" className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition">
                  Remote Setup
                </Link>
              </li>
              <li>
                <Link href="/services#pi-kit" className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition">
                  Pi 5 Kit
                </Link>
              </li>
              <li>
                <Link href="/services#custom" className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition">
                  Custom Builds
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Resources</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="https://github.com/chitownjk/tiker" target="_blank" rel="noopener noreferrer" className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition">
                  GitHub
                </a>
              </li>
              <li>
                <Link href="/docs/api" className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition">
                  API Docs
                </Link>
              </li>
              <li>
                <Link href="/docs/self-hosted" className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition">
                  Self-Hosted
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Company & Legal */}
          <div>
            <h4 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Company</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/about" className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition">
                  About
                </Link>
              </li>
              <li>
                <Link href="/security" className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition">
                  Security
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition">
                  Terms
                </Link>
              </li>
              <li>
                <a href="https://x.com/tikerai" target="_blank" rel="noopener noreferrer" className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition">
                  X / Twitter
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-neutral-200 dark:border-neutral-700 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <img
              src="/images/tiker-icon.svg"
              alt="Tiker"
              className="h-6 w-6"
            />
            <span className="text-sm text-neutral-500 dark:text-neutral-400">
              &copy; 2026 Tiker. Open source under MIT.
            </span>
          </div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Built for people who use AI daily.
          </p>
        </div>
      </div>
    </footer>
  )
}
