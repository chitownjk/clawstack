'use client'

interface CommentContentProps {
  content: string
}

/**
 * Renders comment content with highlighted @mentions and clickable links
 */
export default function CommentContent({ content }: CommentContentProps) {
  // First, rewrite old Supabase storage URLs to use our viewer
  // Pattern: https://[project].supabase.co/storage/v1/object/sign/mc-files/[account_id]/[year]/[month]/[task_id]/[filename]?token=...
  let processedContent = content.replace(
    /https:\/\/[\w-]+\.supabase\.co\/storage\/v1\/object\/sign\/mc-files\/([^?]+)\?token=[^\s)]+/g,
    (match, path) => {
      // Extract filename from path
      const filename = path.split('/').pop()
      return `[${filename}](/api/files/download?path=${encodeURIComponent(path)})`
    }
  )
  
  // Parse and highlight @mentions, and render markdown links
  const parts = processedContent.split(/(@(?:"[^"]+"|[\w]+)|\[([^\]]+)\]\(([^)]+)\))/g)
  
  return (
    <span>
      {parts.map((part, index) => {
        // Check if this part is an @mention
        if (part?.startsWith('@')) {
          const name = part.startsWith('@"') 
            ? part.slice(2, -1) // Remove @" and trailing "
            : part.slice(1) // Remove @
          
          return (
            <span 
              key={index}
              className="text-blue-600 font-medium bg-blue-50 px-1 rounded"
            >
              @{name}
            </span>
          )
        }
        
        // Check if this is a markdown link [text](url)
        if (part?.startsWith('[')) {
          // Extract link parts from the matched groups
          const linkMatch = part.match(/\[([^\]]+)\]\(([^)]+)\)/)
          if (linkMatch) {
            const [, text, url] = linkMatch
            return (
              <a
                key={index}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                {text}
              </a>
            )
          }
        }
        
        return part ? <span key={index}>{part}</span> : null
      })}
    </span>
  )
}
