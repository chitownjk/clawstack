export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-neutral-900 mb-8">Privacy Policy</h1>
        <div className="prose prose-slate max-w-none">
          <p className="text-neutral-600 mb-6">
            Last updated: February 5, 2026
          </p>

          <p className="mb-6">
            Tiker Inc. ("we," "us," or "Tiker") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use Tiker (the "Service"), an AI agent orchestration platform, or visit our website at tiker.com (the "Site"). Please read this carefully. By accessing or using the Service or Site, you agree to this Privacy Policy.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">1. Information We Collect</h2>
          
          <p className="mb-4">We may collect the following types of information when you interact with Tiker:</p>

          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li><strong>Account Information:</strong> When you create an account, we collect your email address, name, and authentication credentials. Payment information is processed via Stripe and never touches our servers.</li>
            
            <li><strong>Task Data:</strong> We store the tasks you create, agent configurations, and execution history. This data is encrypted at rest using AES-256-GCM.</li>
            
            <li><strong>OAuth Tokens:</strong> If you connect Google services (Gmail, Calendar), we store OAuth access tokens encrypted in our database. These are used only to execute tasks you explicitly create.</li>
            
            <li><strong>API Keys:</strong> If using BYOK (Bring Your Own Keys) mode, your API keys are encrypted and only decrypted when your agents execute tasks.</li>
            
            <li><strong>Usage Data:</strong> We collect anonymous usage statistics to improve the Service, including feature usage and performance metrics.</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">2. How We Use Your Information</h2>
          
          <p className="mb-4">We use the information we collect to:</p>

          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>Provide, maintain, and improve the Service</li>
            <li>Execute tasks you create through connected AI agents</li>
            <li>Send you service-related notifications</li>
            <li>Process payments and prevent fraud</li>
            <li>Comply with legal obligations</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">3. Data Security</h2>
          
          <p className="mb-4">We implement industry-standard security measures:</p>

          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>All data encrypted at rest using AES-256-GCM</li>
            <li>All API communications use TLS 1.3</li>
            <li>OAuth tokens and API keys are encrypted and never logged</li>
            <li>Regular security audits and penetration testing</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">4. Data Sharing</h2>
          
          <p className="mb-4">We do not sell your personal information. We may share data with:</p>

          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li><strong>AI Providers:</strong> When you create a task, your task content is sent to AI providers (Anthropic, OpenAI, etc.) for processing. This is necessary to execute your tasks.</li>
            <li><strong>Service Providers:</strong> We use Stripe for payments, Supabase for database hosting, and Vercel for hosting.</li>
            <li><strong>Legal Requirements:</strong> If required by law or to protect our rights.</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">5. Your Rights</h2>
          
          <p className="mb-4">You have the right to:</p>

          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>Access and export your data</li>
            <li>Delete your account and all associated data</li>
            <li>Disconnect third-party integrations</li>
            <li>Opt out of non-essential communications</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">6. Data Retention</h2>
          
          <p className="mb-6">We retain your data while your account is active. Upon account deletion, all personal data is permanently deleted within 30 days. Anonymized usage statistics may be retained for analytics.</p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">7. Contact Us</h2>
          
          <p className="mb-6">If you have questions about this Privacy Policy, contact us at privacy@tiker.com.</p>
        </div>
      </div>
    </div>
  )
}
