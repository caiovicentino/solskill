import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getActivities, getActivityStats, ActivityType } from '@/lib/activity';

/**
 * GET /api/v1/activities
 * 
 * Get activity logs. Requires valid API key.
 * 
 * Query params:
 * - limit: number (default 50, max 100)
 * - offset: number (default 0)
 * - type: ActivityType filter
 * - endpoint: filter by endpoint path
 * - method: filter by HTTP method
 * - startDate: ISO date string
 * - endDate: ISO date string
 * - minStatus: minimum HTTP status code
 * - maxStatus: maximum HTTP status code
 * - stats: if "true", return statistics instead of logs
 */
export async function GET(req: NextRequest) {
  try {
    // Validate API key
    const authHeader = req.headers.get('authorization');
    const apiKey = authHeader?.replace('Bearer ', '');
    
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'API key required. Use Authorization: Bearer <api_key>' },
        { status: 401 }
      );
    }
    
    if (!db.validateApiKey(apiKey)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or unverified API key' },
        { status: 403 }
      );
    }
    
    const agent = db.getAgentByApiKey(apiKey);
    if (!agent) {
      return NextResponse.json(
        { success: false, error: 'Agent not found' },
        { status: 404 }
      );
    }
    
    const { searchParams } = new URL(req.url);
    
    // Check if requesting stats
    if (searchParams.get('stats') === 'true') {
      const stats = getActivityStats(apiKey);
      return NextResponse.json({
        success: true,
        agentId: agent.id,
        stats,
      });
    }
    
    // Parse query params
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const type = searchParams.get('type') as ActivityType | null;
    const endpoint = searchParams.get('endpoint') || undefined;
    const method = searchParams.get('method') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const minStatus = searchParams.get('minStatus') ? parseInt(searchParams.get('minStatus')!) : undefined;
    const maxStatus = searchParams.get('maxStatus') ? parseInt(searchParams.get('maxStatus')!) : undefined;
    
    // Get activities for this agent's API key only
    const result = getActivities({
      limit,
      offset,
      type: type || undefined,
      apiKey, // Only show activities for this API key
      endpoint,
      method,
      startDate,
      endDate,
      minStatus,
      maxStatus,
    });
    
    return NextResponse.json({
      success: true,
      agentId: agent.id,
      activities: result.activities,
      total: result.total,
      pagination: {
        limit,
        offset,
        hasMore: offset + result.activities.length < result.total,
      },
    });
  } catch (error) {
    console.error('Activities error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get activities' },
      { status: 500 }
    );
  }
}
