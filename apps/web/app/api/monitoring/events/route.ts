import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@workspace/database';

/**
 * 监控事件接收端点
 * 接收前端发送的监控数据并存储到数据库
 */

interface MonitoringRequestBody {
  events: Array<{
    type: 'error' | 'performance' | 'user_action' | 'api_call';
    timestamp: string;
    userId?: string;
    sessionId: string;
    data: any;
    metadata?: {
      userAgent: string;
      url: string;
      referrer?: string;
      screenSize?: string;
    };
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const body: MonitoringRequestBody = await request.json();
    const { events } = body;

    if (!events || !Array.isArray(events)) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // 批量插入监控数据
    const monitoringData = events.map(event => ({
      type: event.type,
      timestamp: new Date(event.timestamp),
      userId: event.userId,
      sessionId: event.sessionId,
      data: event.data,
      metadata: event.metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    // 这里可以根据事件类型分别存储到不同的表
    // 为了简化，我们先统一存储到一个表里
    await prisma.monitoringEvent.createMany({
      data: monitoringData,
      skipDuplicates: true,
    });

    // 异步处理严重错误（发送邮件、Slack 通知等）
    const criticalEvents = events.filter(event =>
      event.type === 'error' &&
      event.data.severity === 'critical'
    );

    if (criticalEvents.length > 0) {
      processCriticalErrors(criticalEvents).catch(console.error);
    }

    return NextResponse.json({
      success: true,
      processed: events.length,
      criticalEvents: criticalEvents.length
    });

  } catch (error) {
    console.error('Error processing monitoring events:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * 处理严重错误
 */
async function processCriticalErrors(events: any[]) {
  // 这里可以集成邮件发送、Slack 通知、PagerDuty 等
  for (const event of events) {
    console.error('Critical error detected:', event);

    // 发送到错误监控服务（如 Sentry）
    // if (process.env.SENTRY_DSN) {
    //   Sentry.captureException(new Error(event.data.message));
    // }

    // 发送邮件通知
    // await sendErrorNotificationEmail(event);

    // 发送 Slack 通知
    // await sendSlackNotification(event);
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {};
    if (sessionId) {
      where.sessionId = sessionId;
    }
    if (type) {
      where.type = type;
    }

    const [events, total] = await Promise.all([
      prisma.monitoringEvent.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.monitoringEvent.count({ where }),
    ]);

    // 统计数据
    const stats = await prisma.monitoringEvent.groupBy({
      by: ['type'],
      _count: {
        type: true,
      },
      where,
    });

    return NextResponse.json({
      events,
      total,
      stats: stats.reduce((acc, stat) => {
        acc[stat.type] = stat._count.type;
        return acc;
      }, {} as Record<string, number>),
      limit,
      offset,
    });

  } catch (error) {
    console.error('Error fetching monitoring events:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}