import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { PerformanceMonitorService } from '~/server/services/performance-monitor';

const prisma = new PrismaClient();
const performanceMonitor = new PerformanceMonitorService(prisma);

/**
 * GET /api/admin/performance
 * 获取数据库性能统计信息
 */
export async function GET(request: NextRequest) {
  try {
    // 检查权限（实际应用中应该验证用户权限）
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');

    switch (type) {
      case 'version':
        const versionInfo = await performanceMonitor.checkPostgreSQLVersion();
        return NextResponse.json({
          success: true,
          data: versionInfo
        });

      case 'io':
        const ioStats = await performanceMonitor.getIOStatistics();
        return NextResponse.json({
          success: true,
          data: ioStats
        });

      case 'wal':
        const walStats = await performanceMonitor.getWALStatistics();
        return NextResponse.json({
          success: true,
          data: walStats
        });

      case 'checkpoint':
        const checkpointStats = await performanceMonitor.getCheckpointStatistics();
        return NextResponse.json({
          success: true,
          data: checkpointStats
        });

      case 'vacuum':
        const vacuumStats = await performanceMonitor.getVacuumStatistics();
        return NextResponse.json({
          success: true,
          data: vacuumStats
        });

      case 'tables':
        const tableStats = await performanceMonitor.getTableStatistics();
        return NextResponse.json({
          success: true,
          data: tableStats
        });

      case 'indexes':
        const indexStats = await performanceMonitor.getIndexStatistics();
        return NextResponse.json({
          success: true,
          data: indexStats
        });

      case 'connections':
        const connections = await performanceMonitor.getActiveConnections();
        return NextResponse.json({
          success: true,
          data: connections
        });

      case 'report':
      default:
        const fullReport = await performanceMonitor.getPerformanceReport();
        return NextResponse.json({
          success: true,
          data: fullReport
        });
    }
  } catch (error) {
    console.error('❌ 性能监控 API 错误:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '获取性能统计失败'
        }
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/performance
 * 执行性能监控操作
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'enable-stats':
        await performanceMonitor.enableEnhancedStatistics();
        return NextResponse.json({
          success: true,
          message: 'PostgreSQL 18 增强统计已启用'
        });

      default:
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_ACTION',
              message: '不支持的操作'
            }
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('❌ 性能监控操作错误:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '执行操作失败'
        }
      },
      { status: 500 }
    );
  }
}