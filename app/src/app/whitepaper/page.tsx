import fs from 'fs';
import path from 'path';

// Sanitize URLs to prevent javascript: XSS attacks
function sanitizeUrl(url: string): string {
  const allowedProtocols = ['http:', 'https:', 'mailto:']
  try {
    // Handle relative URLs
    if (url.startsWith('/') || url.startsWith('#')) return url
    const parsed = new URL(url)
    return allowedProtocols.includes(parsed.protocol) ? url : '#'
  } catch {
    // Invalid URL, check if it looks like a relative path
    if (/^[a-zA-Z0-9\-_\/\.]+$/.test(url)) return url
    return '#'
  }
}

function markdownToHtml(markdown: string): string {
  let html = markdown;

  // Escape HTML entities
  html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Headers
  html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Links - sanitize URLs to prevent XSS
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => 
    `<a href="${sanitizeUrl(url)}">${text}</a>`
  );

  // Code blocks
  html = html.replace(/```([^`]+)```/g, '<pre><code>$1</code></pre>');

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Lists - unordered
  const lines = html.split('\n');
  let inList = false;
  const processedLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check for list items
    if (line.match(/^[\-\*] /)) {
      if (!inList) {
        processedLines.push('<ul>');
        inList = true;
      }
      processedLines.push('<li>' + line.replace(/^[\-\*] /, '') + '</li>');
    } else {
      if (inList) {
        processedLines.push('</ul>');
        inList = false;
      }
      processedLines.push(line);
    }
  }
  if (inList) {
    processedLines.push('</ul>');
  }

  html = processedLines.join('\n');

  // Paragraphs - double line break
  html = html.replace(/\n\n/g, '</p><p>');
  html = '<p>' + html + '</p>';

  // Clean up empty paragraphs
  html = html.replace(/<p><\/p>/g, '');
  html = html.replace(/<p>\s*<h/g, '<h');
  html = html.replace(/<\/h([1-6])>\s*<\/p>/g, '</h$1>');
  html = html.replace(/<p>\s*<ul>/g, '<ul>');
  html = html.replace(/<\/ul>\s*<\/p>/g, '</ul>');
  html = html.replace(/<p>\s*<pre>/g, '<pre>');
  html = html.replace(/<\/pre>\s*<\/p>/g, '</pre>');

  // Single line breaks
  html = html.replace(/\n/g, '<br>');

  return html;
}

function getWhitepaper(): string {
  const whitepaperPath = path.join(process.cwd(), 'public', 'WHITEPAPER.md');
  const fileContents = fs.readFileSync(whitepaperPath, 'utf8');
  return markdownToHtml(fileContents);
}

export default function WhitepaperPage() {
  const content = getWhitepaper();
  
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
