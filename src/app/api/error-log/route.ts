import { NextRequest, NextResponse } from 'next/server';

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

export async function POST(request: NextRequest) {
  try {
    const errorLog: ErrorLog = await request.json();

    console.error('Client error:', {
      type: errorLog.type,
      message: errorLog.message,
      url: errorLog.url,
      timestamp: errorLog.timestamp,
    });

    return NextResponse.json({ logged: true });
  } catch (err) {
    console.error('Error logging endpoint failed:', err);
    return NextResponse.json({ error: 'Failed to log error' }, { status: 500 });
  }
}
