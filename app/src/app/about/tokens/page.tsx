export default function TokensPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-semibold text-neutral-900 mb-2">Token Economics</h1>
      <p className="text-neutral-600 mb-8">
        How we're thinking about tokens, trust, and preventing gaming.
      </p>

      {/* Status callout */}
      <div className="card p-6 mb-12 border-l-4 border-l-yellow-500">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
          <span className="text-sm font-medium text-yellow-700">In development</span>
        </div>
        <p className="text-neutral-600">
          Tiker currently uses internal points. We're designing a two-token on-chain model 
          for the future. This page explains our thinking.
        </p>
      </div>

      {/* The Problem */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold text-neutral-900 mb-4">The problem with buyable trust</h2>
        <p className="text-neutral-600 leading-relaxed mb-4">
          If trust tokens are purchasable, a well-funded attacker can:
        </p>
        <ol className="list-decimal list-inside space-y-2 text-neutral-600 mb-4">
          <li>Buy a million tokens</li>
          <li>Vouch for fake accounts (absorbing penalties - who cares, they're rich)</li>
          <li>Use those accounts to approve garbage patterns</li>
          <li>Destroy network trust</li>
          <li>Still have 997,000 tokens left</li>
        </ol>
        <p className="text-neutral-600 leading-relaxed">
          The asymmetric penalties (3x for bad actions) only work if you can't infinitely refill your balance with money.
        </p>
      </section>

      {/* The Solution */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold text-neutral-900 mb-4">Our solution: two tokens</h2>
        <p className="text-neutral-600 leading-relaxed mb-6">
          Separate governance (buyable) from trust (earned).
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          {/* TIKR */}
          <div className="card p-5 border-2 border-neutral-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-neutral-900">TIKR</h3>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Tradeable</span>
            </div>
            <ul className="space-y-2 text-sm text-neutral-600">
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Can be bought, sold, traded</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Vote on protocol rules</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Stake for rewards</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Speculative upside</span>
              </li>
            </ul>
            <div className="mt-4 pt-4 border-t border-neutral-100">
              <p className="text-xs text-neutral-500">
                For investors and governance participants.
              </p>
            </div>
          </div>

          {/* Trust Points */}
          <div className="card p-5 border-2 border-neutral-900">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-neutral-900">Trust Points</h3>
              <span className="text-xs bg-neutral-900 text-white px-2 py-1 rounded">Soulbound</span>
            </div>
            <ul className="space-y-2 text-sm text-neutral-600">
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">✗</span>
                <span>Cannot be bought or sold</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Earned through contributions</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Required to review and vouch</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Lost through bad actions</span>
              </li>
            </ul>
            <div className="mt-4 pt-4 border-t border-neutral-100">
              <p className="text-xs text-neutral-500">
                For contributors proving their value.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What each controls */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold text-neutral-900 mb-4">What each token controls</h2>
        
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-neutral-700">Action</th>
                <th className="text-center px-4 py-3 font-medium text-neutral-700">TIKR</th>
                <th className="text-center px-4 py-3 font-medium text-neutral-700">Trust Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              <tr>
                <td className="px-4 py-3 text-neutral-600">Vote on protocol changes</td>
                <td className="px-4 py-3 text-center text-green-600">✓</td>
                <td className="px-4 py-3 text-center text-neutral-300">-</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-neutral-600">Review patterns</td>
                <td className="px-4 py-3 text-center text-neutral-300">-</td>
                <td className="px-4 py-3 text-center text-green-600">✓</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-neutral-600">Vouch for users</td>
                <td className="px-4 py-3 text-center text-neutral-300">-</td>
                <td className="px-4 py-3 text-center text-green-600">✓</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-neutral-600">Submit patterns</td>
                <td className="px-4 py-3 text-center text-neutral-300">-</td>
                <td className="px-4 py-3 text-center text-green-600">✓</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-neutral-600">Earn staking rewards</td>
                <td className="px-4 py-3 text-center text-green-600">✓</td>
                <td className="px-4 py-3 text-center text-neutral-300">-</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-neutral-600">Trade on exchanges</td>
                <td className="px-4 py-3 text-center text-green-600">✓</td>
                <td className="px-4 py-3 text-center text-red-400">✗</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Whale scenario */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold text-neutral-900 mb-4">The whale test</h2>
        <div className="card p-5 bg-neutral-50">
          <p className="text-neutral-600 mb-4">
            <strong>Scenario:</strong> A whale buys 1M TIKR tokens.
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-green-600">✓</span>
              <span className="text-neutral-600">Can vote on governance proposals</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600">✓</span>
              <span className="text-neutral-600">Can stake for yield</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600">✓</span>
              <span className="text-neutral-600">Benefits if network succeeds</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-red-500">✗</span>
              <span className="text-neutral-600">Cannot buy Trust Points</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-red-500">✗</span>
              <span className="text-neutral-600">Cannot vouch for fake accounts</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-red-500">✗</span>
              <span className="text-neutral-600">Cannot approve garbage patterns</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-red-500">✗</span>
              <span className="text-neutral-600">Cannot shortcut to Tier 2</span>
            </div>
          </div>
          <p className="text-sm text-neutral-500 mt-4 pt-4 border-t border-neutral-200">
            <strong>Result:</strong> Trust is earned. Governance is bought. Both are legitimate.
          </p>
        </div>
      </section>

      {/* Current state */}
      <section className="card p-6 bg-blue-50 border border-blue-100">
        <h2 className="text-lg font-semibold text-neutral-900 mb-3">What this means for you today</h2>
        <p className="text-neutral-600 mb-4">
          Right now, Tiker uses internal points (the "Trust Points" part of this model). 
          Contribute patterns, earn points, build reputation.
        </p>
        <p className="text-neutral-600">
          When we launch on-chain, your earned Trust Points will migrate. 
          Early contributors = early trust. That matters.
        </p>
      </section>
    </div>
  )
}
