#!/bin/bash
set -e

echo "🚀 Tiker - One-Command Install"
echo "========================================"
echo ""

# Check prerequisites
command -v git >/dev/null 2>&1 || { echo "❌ git is required but not installed. Aborting." >&2; exit 1; }
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required but not installed. Aborting." >&2; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "📦 Installing pnpm..."; npm install -g pnpm; }

echo "✅ Prerequisites check passed"
echo ""

# Clone repository (or skip if already in repo)
if [ ! -d ".git" ]; then
  echo "📥 Cloning Tiker..."
  git clone https://github.com/yourusername/mission-control.git
  cd mission-control
else
  echo "📂 Using existing repository"
fi

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Setup environment
if [ ! -f ".env.local" ]; then
  echo "⚙️  Setting up environment..."
  cp .env.example .env.local
  echo ""
  echo "⚠️  IMPORTANT: Edit .env.local with your Supabase credentials"
  echo "   Get them from: https://app.supabase.com"
  echo ""
  read -p "Press Enter when you've configured .env.local..."
else
  echo "✅ .env.local already exists"
fi

# Build
echo "🔨 Building application..."
pnpm build

echo ""
echo "✅ Installation complete!"
echo ""
echo "Next steps:"
echo "1. Make sure .env.local has your Supabase credentials"
echo "2. Run the database migration in supabase/schema.sql"
echo "3. Start the server: pnpm dev"
echo ""
echo "Visit http://localhost:3000 when ready"
echo ""
