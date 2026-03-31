import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

interface ErrorLog {
  type: string;
  message: string;
  stack?: string;
  componentStack?: string;
  url: string;
  userAgent: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// In-memory deduplication cache (in production, use Redis or DB)
const errorCache = new Map<string, { count: number; lastSeen: string; issueNumber?: number }>();

export async function POST(request: NextRequest) {
  try {
    const errorLog: ErrorLog = await request.json();

    // Create hash for deduplication
    const errorHash = createErrorHash(errorLog);

    // Check if we've seen this error recently
    const cached = errorCache.get(errorHash);
    if (cached) {
      cached.count++;
      cached.lastSeen = errorLog.timestamp;
      errorCache.set(errorHash, cached);

      // Update existing issue if it exists
      if (cached.issueNumber && process.env.GITHUB_TOKEN) {
        await updateGitHubIssue(cached.issueNumber, cached.count, errorLog);
      }

      return NextResponse.json({
        logged: true,
        deduplicated: true,
        issueNumber: cached.issueNumber,
        count: cached.count
      });
    }

    // New error - create GitHub issue
    let issueNumber: number | undefined;
    if (process.env.GITHUB_TOKEN) {
      try {
        issueNumber = await createGitHubIssue(errorLog);
      } catch (err) {
        console.error('Failed to create GitHub issue:', err);
      }
    }

    // Cache this error
    errorCache.set(errorHash, {
      count: 1,
      lastSeen: errorLog.timestamp,
      issueNumber,
    });

    // Log to console for local debugging
    console.error('🔴 Error logged:', {
      type: errorLog.type,
      message: errorLog.message,
      url: errorLog.url,
      issueNumber,
    });

    return NextResponse.json({
      logged: true,
      issueNumber,
      count: 1
    });
  } catch (err) {
    console.error('Error logging endpoint failed:', err);
    return NextResponse.json({ error: 'Failed to log error' }, { status: 500 });
  }
}

function createErrorHash(errorLog: ErrorLog): string {
  // Create hash from type + message + first line of stack
  const stackFirstLine = errorLog.stack?.split('\n')[0] || '';
  const hashInput = `${errorLog.type}:${errorLog.message}:${stackFirstLine}`;
  return crypto.createHash('md5').update(hashInput).digest('hex');
}

async function createGitHubIssue(errorLog: ErrorLog): Promise<number> {
  const owner = 'brianstefanjensen'; // Update with your GitHub username
  const repo = 'bird-quiz'; // Update with your repo name

  const title = `[Auto] ${errorLog.type}: ${errorLog.message.substring(0, 80)}`;
  const body = formatIssueBody(errorLog);
  const labels = ['bug', 'auto-generated', getErrorLabel(errorLog.type)];

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/issues`,
    {
      method: 'POST',
      headers: {
        'Authorization': `token ${process.env.GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({
        title,
        body,
        labels: labels.filter(Boolean),
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub API error: ${response.status} ${error}`);
  }

  const issue = await response.json();
  return issue.number;
}

async function updateGitHubIssue(
  issueNumber: number,
  count: number,
  errorLog: ErrorLog
): Promise<void> {
  const owner = 'brianstefanjensen';
  const repo = 'bird-quiz';

  const comment = `This error has now occurred **${count} times**.\n\nLast seen: ${errorLog.timestamp}\nURL: ${errorLog.url}\nUser Agent: ${errorLog.userAgent}`;

  await fetch(
    `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
    {
      method: 'POST',
      headers: {
        'Authorization': `token ${process.env.GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({ body: comment }),
    }
  );
}

function formatIssueBody(errorLog: ErrorLog): string {
  return `## Error Details

**Type:** ${errorLog.type}
**Message:** ${errorLog.message}
**URL:** ${errorLog.url}
**Timestamp:** ${errorLog.timestamp}
**User Agent:** ${errorLog.userAgent}

${errorLog.stack ? `### Stack Trace\n\`\`\`\n${errorLog.stack}\n\`\`\`` : ''}

${errorLog.componentStack ? `### Component Stack\n\`\`\`\n${errorLog.componentStack}\n\`\`\`` : ''}

${errorLog.metadata ? `### Additional Metadata\n\`\`\`json\n${JSON.stringify(errorLog.metadata, null, 2)}\n\`\`\`` : ''}

---
*This issue was automatically created by the error logging system.*
`;
}

function getErrorLabel(errorType: string): string {
  const labelMap: Record<string, string> = {
    'image-load-error': 'images',
    'react-error': 'react',
    'global-error': 'javascript',
    'unhandled-promise': 'promise',
    'api-error': 'api',
  };
  return labelMap[errorType] || '';
}
