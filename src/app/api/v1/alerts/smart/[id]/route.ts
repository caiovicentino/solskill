import { NextRequest, NextResponse } from 'next/server';

// Shared reference to the same in-memory store
// In Next.js, module-level state is shared within the same server process
const smartAlerts: Map<string, any[]> = new Map();

// We need to access the parent route's store. In production this would use a DB.
// For the hackathon, we use a global store pattern.
const getGlobalStore = (): Map<string, any[]> => {
  const g = globalThis as any;
  if (!g.__smartAlertsStore) {
    g.__smartAlertsStore = new Map<string, any[]>();
  }
  return g.__smartAlertsStore;
};

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const apiKey = request.headers.get('x-api-key') || 'anonymous';
    const store = getGlobalStore();
    const alerts = store.get(apiKey) || [];

    const index = alerts.findIndex((a: any) => a.id === id);
    if (index === -1) {
      return NextResponse.json({
        success: false,
        error: `Alert ${id} not found`,
      }, { status: 404 });
    }

    const deleted = alerts.splice(index, 1)[0];
    store.set(apiKey, alerts);

    return NextResponse.json({
      success: true,
      message: `Alert ${id} deleted`,
      deletedAlert: deleted,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to delete alert',
    }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const apiKey = request.headers.get('x-api-key') || 'anonymous';
    const store = getGlobalStore();
    const alerts = store.get(apiKey) || [];

    const alert = alerts.find((a: any) => a.id === id);
    if (!alert) {
      return NextResponse.json({
        success: false,
        error: `Alert ${id} not found`,
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      alert,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to get alert',
    }, { status: 500 });
  }
}
