import fs from 'fs';
import path from 'path';
import { remark } from 'remark';
import html from 'remark-html';
import DOMPurify from 'isomorphic-dompurify';

async function getWhitepaper(): Promise<string> {
  const whitepaperPath = path.join(process.cwd(), 'public', 'WHITEPAPER.md');
  const fileContents = fs.readFileSync(whitepaperPath, 'utf8');
  const processed = await remark().use(html).process(fileContents);
  return DOMPurify.sanitize(processed.toString());
}

export default async function WhitepaperPage() {
  const content = await getWhitepaper();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="bg-white/95 backdrop-blur rounded-lg shadow-2xl p-8 md:p-12">
          <div 
            className="prose prose-slate max-w-none"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
      </div>
    </div>
  );
}
