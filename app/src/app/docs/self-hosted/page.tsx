import Link from 'next/link'

export const metadata = {
  title: 'Self-Hosted Setup - Tiker Docs',
  description: 'Run Tiker on your own infrastructure. Complete guide to self-hosting for maximum security and control.',
}

export default function SelfHostedPage() {
  return (
    <main className="min-h-screen">
      {/* Header */}
      <section className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 mb-4">
            <Link href="/docs" className="hover:text-neutral-900 dark:hover:text-neutral-100">Docs</Link>
            <span>/</span>
            <span>Self-Hosted Setup</span>
          </div>
          
          <h1 className="text-3xl md:text-4xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
            Self-Hosted Setup Guide
          </h1>
          
          <p className="text-lg text-neutral-600 dark:text-neutral-400">
            Run Tiker on your own infrastructure for maximum security and control. We actually recommend this for the tightest security.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 md:py-16">
        <div className="max-w-4xl mx-auto px-6">
          
          {/* Why Self-Host */}
          <div className="mb-16">
            <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
              Why self-host?
            </h2>
            
            <div className="prose prose-neutral dark:prose-invert max-w-none">
              <p className="text-neutral-600 dark:text-neutral-400">
                Self-hosting gives you:
              </p>
              
              <ul className="space-y-2 text-neutral-600 dark:text-neutral-400">
                <li><strong className="text-neutral-900 dark:text-neutral-100">Complete data control</strong> - Your data never leaves your network</li>
                <li><strong className="text-neutral-900 dark:text-neutral-100">No third-party trust</strong> - You verify the code, you run the infrastructure</li>
                <li><strong className="text-neutral-900 dark:text-neutral-100">Custom security policies</strong> - Integrate with your existing security stack</li>
                <li><strong className="text-neutral-900 dark:text-neutral-100">Air-gapped deployments</strong> - Run completely offline if needed</li>
              </ul>
              
              <p className="text-neutral-600 dark:text-neutral-400">
                The tradeoff: you're responsible for uptime, updates, and security patches. If that sounds good to you, read on.
              </p>
            </div>
          </div>

          {/* Prerequisites */}
          <div className="mb-16">
            <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
              Prerequisites
            </h2>
            
            <div className="card p-6 mb-6">
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Required</h3>
              <ul className="space-y-3 text-neutral-600 dark:text-neutral-400">
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span><strong>Node.js 20+</strong> - We recommend using nvm for version management</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span><strong>PostgreSQL 14+</strong> - For data persistence</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span><strong>OpenClaw</strong> - The agent runtime (npm install -g openclaw)</span>
                </li>
              </ul>
            </div>
            
            <div className="card p-6">
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Recommended</h3>
              <ul className="space-y-3 text-neutral-600 dark:text-neutral-400">
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span><strong>Tailscale</strong> - For secure private networking (see below)</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span><strong>Docker</strong> - For easier deployment and isolation</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span><strong>Reverse proxy</strong> - nginx or Caddy for HTTPS termination</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Why Tailscale */}
          <div className="mb-16">
            <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
              Why Tailscale?
            </h2>
            
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-6 mb-6">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-200">Security recommendation</p>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    Never expose your OpenClaw gateway directly to the internet. Use Tailscale or a similar VPN to create a private network.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="prose prose-neutral dark:prose-invert max-w-none">
              <p className="text-neutral-600 dark:text-neutral-400">
                Tailscale creates a secure mesh network between your devices without opening ports to the public internet. This means:
              </p>
              
              <ul className="space-y-2 text-neutral-600 dark:text-neutral-400">
                <li><strong className="text-neutral-900 dark:text-neutral-100">No exposed ports</strong> - Your gateway isn't reachable from the internet</li>
                <li><strong className="text-neutral-900 dark:text-neutral-100">End-to-end encryption</strong> - Traffic is encrypted between nodes</li>
                <li><strong className="text-neutral-900 dark:text-neutral-100">Zero-config networking</strong> - Devices find each other automatically</li>
                <li><strong className="text-neutral-900 dark:text-neutral-100">Access control</strong> - Define who can reach what</li>
              </ul>
              
              <p className="text-neutral-600 dark:text-neutral-400">
                Free tier is generous for personal use. Set it up at{' '}
                <a href="https://tailscale.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                  tailscale.com
                </a>
              </p>
            </div>
          </div>

          {/* Gateway Tokens */}
          <div className="mb-16">
            <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
              Gateway tokens
            </h2>
            
            <div className="prose prose-neutral dark:prose-invert max-w-none mb-6">
              <p className="text-neutral-600 dark:text-neutral-400">
                Your OpenClaw gateway should always require authentication tokens. This prevents unauthorized access even on your private network.
              </p>
            </div>
            
            <div className="card bg-neutral-900 dark:bg-neutral-950 p-6 overflow-x-auto">
              <pre className="text-sm text-neutral-100"><code>{`# Generate a secure token
openssl rand -base64 32

# Set in your environment
export OPENCLAW_GATEWAY_TOKEN="your-generated-token"

# Or in your openclaw.yaml
gateway:
  token: "your-generated-token"
  host: "0.0.0.0"  # Bind to all interfaces (safe behind Tailscale)
  port: 18789`}</code></pre>
            </div>
            
            <div className="mt-6 prose prose-neutral dark:prose-invert max-w-none">
              <p className="text-neutral-600 dark:text-neutral-400">
                <strong className="text-neutral-900 dark:text-neutral-100">Why this matters:</strong> Even on a private network, defense in depth is critical. If someone gains access to your network, the token prevents them from controlling your agents.
              </p>
            </div>
          </div>

          {/* Quick Start */}
          <div className="mb-16">
            <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
              Quick start
            </h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-3">1. Clone and install</h3>
                <div className="card bg-neutral-900 dark:bg-neutral-950 p-6 overflow-x-auto">
                  <pre className="text-sm text-neutral-100"><code>{`git clone https://github.com/chitownjk/tiker.git
cd tiker
npm install`}</code></pre>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-3">2. Configure environment</h3>
                <div className="card bg-neutral-900 dark:bg-neutral-950 p-6 overflow-x-auto">
                  <pre className="text-sm text-neutral-100"><code>{`cp .env.example .env.local

# Edit .env.local with your values:
DATABASE_URL="postgresql://user:pass@localhost:5432/tiker"
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# AI provider keys (at least one)
ANTHROPIC_API_KEY="sk-ant-..."
OPENAI_API_KEY="sk-..."
GOOGLE_API_KEY="..."`}</code></pre>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-3">3. Set up database</h3>
                <div className="card bg-neutral-900 dark:bg-neutral-950 p-6 overflow-x-auto">
                  <pre className="text-sm text-neutral-100"><code>{`# Create database
createdb tiker

# Run migrations
npm run db:migrate`}</code></pre>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-3">4. Start services</h3>
                <div className="card bg-neutral-900 dark:bg-neutral-950 p-6 overflow-x-auto">
                  <pre className="text-sm text-neutral-100"><code>{`# Start the web app
npm run build
npm start

# In another terminal, start OpenClaw gateway
openclaw gateway start`}</code></pre>
                </div>
              </div>
            </div>
          </div>

          {/* Docker Deployment */}
          <div className="mb-16">
            <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
              Docker deployment
            </h2>
            
            <div className="prose prose-neutral dark:prose-invert max-w-none mb-6">
              <p className="text-neutral-600 dark:text-neutral-400">
                For production, we recommend Docker Compose:
              </p>
            </div>
            
            <div className="card bg-neutral-900 dark:bg-neutral-950 p-6 overflow-x-auto">
              <pre className="text-sm text-neutral-100"><code>{`# docker-compose.yml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://tiker:password@db:5432/tiker
      - NEXTAUTH_URL=http://localhost:3000
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=tiker
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=tiker
    restart: unless-stopped

  gateway:
    image: ghcr.io/openclaw/openclaw:latest
    environment:
      - OPENCLAW_GATEWAY_TOKEN=\${GATEWAY_TOKEN}
    volumes:
      - ./workspace:/workspace
    restart: unless-stopped

volumes:
  postgres_data:`}</code></pre>
            </div>
            
            <div className="card bg-neutral-900 dark:bg-neutral-950 p-6 overflow-x-auto mt-4">
              <pre className="text-sm text-neutral-100"><code>{`# Start everything
docker-compose up -d`}</code></pre>
            </div>
          </div>

          {/* Security Checklist */}
          <div className="mb-16">
            <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
              Security checklist
            </h2>
            
            <div className="card p-6">
              <div className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" className="w-5 h-5 rounded border-neutral-300 text-blue-600 mt-0.5" />
                  <span className="text-neutral-700 dark:text-neutral-300">
                    <strong className="text-neutral-900 dark:text-neutral-100">Private network only</strong>
                    <br />
                    <span className="text-sm text-neutral-500">Gateway not exposed to public internet (use Tailscale/VPN)</span>
                  </span>
                </label>
                
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" className="w-5 h-5 rounded border-neutral-300 text-blue-600 mt-0.5" />
                  <span className="text-neutral-700 dark:text-neutral-300">
                    <strong className="text-neutral-900 dark:text-neutral-100">Gateway token configured</strong>
                    <br />
                    <span className="text-sm text-neutral-500">Strong random token set for OPENCLAW_GATEWAY_TOKEN</span>
                  </span>
                </label>
                
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" className="w-5 h-5 rounded border-neutral-300 text-blue-600 mt-0.5" />
                  <span className="text-neutral-700 dark:text-neutral-300">
                    <strong className="text-neutral-900 dark:text-neutral-100">HTTPS enabled</strong>
                    <br />
                    <span className="text-sm text-neutral-500">TLS termination via reverse proxy (nginx/Caddy)</span>
                  </span>
                </label>
                
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" className="w-5 h-5 rounded border-neutral-300 text-blue-600 mt-0.5" />
                  <span className="text-neutral-700 dark:text-neutral-300">
                    <strong className="text-neutral-900 dark:text-neutral-100">Database secured</strong>
                    <br />
                    <span className="text-sm text-neutral-500">Strong password, not exposed to network, regular backups</span>
                  </span>
                </label>
                
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" className="w-5 h-5 rounded border-neutral-300 text-blue-600 mt-0.5" />
                  <span className="text-neutral-700 dark:text-neutral-300">
                    <strong className="text-neutral-900 dark:text-neutral-100">Secrets management</strong>
                    <br />
                    <span className="text-sm text-neutral-500">API keys stored securely, not in git</span>
                  </span>
                </label>
                
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" className="w-5 h-5 rounded border-neutral-300 text-blue-600 mt-0.5" />
                  <span className="text-neutral-700 dark:text-neutral-300">
                    <strong className="text-neutral-900 dark:text-neutral-100">Update schedule</strong>
                    <br />
                    <span className="text-sm text-neutral-500">Plan for regular security updates (git pull + rebuild)</span>
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Getting Help */}
          <div className="mb-16">
            <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
              Getting help
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <Link href="https://github.com/chitownjk/tiker/issues" className="card p-6 hover:border-neutral-300 dark:hover:border-neutral-600 transition group" target="_blank" rel="noopener noreferrer">
                <div className="flex items-center gap-3 mb-2">
                  <svg className="w-6 h-6 text-neutral-700 dark:text-neutral-300" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                  <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">GitHub Issues</h3>
                </div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Bug reports and feature requests</p>
              </Link>
              
              <Link href="https://discord.gg/teukPjD8BT" className="card p-6 hover:border-neutral-300 dark:hover:border-neutral-600 transition group" target="_blank" rel="noopener noreferrer">
                <div className="flex items-center gap-3 mb-2">
                  <svg className="w-6 h-6 text-neutral-700 dark:text-neutral-300" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                  <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">Discord Community</h3>
                </div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Chat with other self-hosters</p>
              </Link>
            </div>
          </div>

          {/* Back to Security */}
          <div className="border-t border-neutral-200 dark:border-neutral-800 pt-8">
            <Link href="/security" className="text-blue-600 dark:text-blue-400 hover:underline">
              ← Back to Security Overview
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
