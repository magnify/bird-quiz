# Error Logging & Monitoring System

## Overview

The app has a comprehensive error logging system that automatically tracks errors and creates GitHub issues.

## Features

### ✅ Implemented

1. **Error Tracking**
   - React errors (via ErrorBoundary)
   - Global JavaScript errors
   - Unhandled promise rejections
   - Image load failures
   - API errors

2. **Automatic GitHub Issue Creation**
   - New errors create GitHub issues automatically
   - Duplicate errors update existing issues with counts
   - Issues include stack traces, metadata, and timestamps
   - Labeled by error type for easy filtering

3. **Deduplication**
   - Errors are hashed to prevent duplicate issues
   - Recurring errors increment count on existing issue
   - In-memory cache (production: use Redis or Supabase)

## Setup

### 1. GitHub Personal Access Token

Create a GitHub token with `repo` scope:

1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select scopes: `repo` (full repository access)
4. Copy the token

### 2. Configure Netlify Environment Variable

```bash
netlify env:set GITHUB_TOKEN "ghp_your_token_here"
```

Or via Netlify dashboard:
- Go to Site Settings → Environment Variables
- Add `GITHUB_TOKEN` with your token value
- Deploy type: Production

### 3. Update Repository Info

In `/src/app/api/error-log/route.ts`:

```typescript
const owner = 'brianstefanjensen'; // Your GitHub username
const repo = 'bird-quiz'; // Your repo name
```

## Error Types & Labels

| Error Type | Label | Description |
|------------|-------|-------------|
| `react-error` | `react` | React component errors caught by ErrorBoundary |
| `global-error` | `javascript` | Uncaught JavaScript errors |
| `unhandled-promise` | `promise` | Unhandled promise rejections |
| `image-load-error` | `images` | Failed image loads |
| `api-error` | `api` | API request failures |

All auto-created issues get `bug` and `auto-generated` labels.

## Usage

### Client-Side Error Logging

```typescript
import { logError } from '@/lib/error-tracking/ErrorBoundary';

logError({
  type: 'custom-error',
  message: 'Something went wrong',
  url: window.location.href,
  metadata: {
    userId: '123',
    action: 'submit-form',
  },
});
```

### Image Error Handling

```typescript
import { useImageErrorHandler } from '@/lib/error-tracking/image-error-handler';

function MyComponent() {
  const handleImageError = useImageErrorHandler('MyComponent');

  return <img src={url} onError={handleImageError} />;
}
```

### API Error Logging

```typescript
try {
  const response = await fetch('/api/endpoint');
  if (!response.ok) throw new Error('API failed');
} catch (error) {
  logError({
    type: 'api-error',
    message: error.message,
    url: window.location.href,
    metadata: { endpoint: '/api/endpoint' },
  });
}
```

## Testing

### Test Error Logging Locally

```javascript
// In browser console
fetch('/api/error-log', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'test-error',
    message: 'Test error message',
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
  }),
});
```

Check server logs for: `🔴 Error logged:`

### Test GitHub Issue Creation

1. Set `GITHUB_TOKEN` in `.env.local` (for local testing)
2. Run the fetch command above
3. Check https://github.com/brianstefanjensen/bird-quiz/issues
4. You should see a new issue created

## Current Status

✅ Error logging system implemented
✅ Image error tracking active
✅ Global error handlers installed
✅ ErrorBoundary wrapping QuizApp
⏳ GITHUB_TOKEN not set (issues will be logged to console only)
⏳ In-memory deduplication (production should use Supabase)

## Next Steps

1. **Set GITHUB_TOKEN in Netlify** - enables automatic issue creation
2. **Create admin log viewer** - UI to browse error logs in real-time
3. **Migrate deduplication to Supabase** - persist error cache across deploys
4. **Add usage analytics** - track quiz completions, popular birds, etc.
