#!/usr/bin/env node

/**
 * 智能开发服务器启动脚本
 * 自动检测和清理端口，然后启动开发服务器
 */

const { spawn } = require('child_process');
const { isPortInUse } = require('./check-ports');

const PORTS = [3000, 3001, 5432, 5555];

// 检查关键端口是否被占用
async function checkPorts() {
  console.log('🔍 检查开发环境端口...\n');

  const occupiedPorts = [];

  for (const port of PORTS) {
    if (isPortInUse(port)) {
      occupiedPorts.push(port);
    }
  }

  if (occupiedPorts.length > 0) {
    console.log('⚠️  发现以下端口被占用:', occupiedPorts.join(', '));
    console.log('💡 正在自动清理...\n');

    // 自动清理端口
    const { cleanAllPorts } = require('./clean-ports');
    await cleanAllPorts(true);

    console.log('🎉 端口清理完成！');
  } else {
    console.log('✅ 所有端口都可用！');
  }

  return true;
}

// 启动开发服务器
function startDevServer() {
  console.log('🚀 启动开发服务器...\n');

  const child = spawn('pnpm', ['dev'], {
    stdio: 'inherit',
    shell: true
  });

  child.on('exit', (code) => {
    if (code !== 0) {
      console.log(`\n❌ 开发服务器异常退出，代码: ${code}`);
      console.log('💡 尝试以下解决方案:');
      console.log('1. 运行 pnpm clean-ports:force 清理端口');
      console.log('2. 运行 pnpm dev-reload 重新启动');
      console.log('3. 检查是否有其他进程占用了端口\n');
    }
  });

  // 优雅退出处理
  process.on('SIGINT', () => {
    console.log('\n📡 收到 SIGINT 信号，正在关闭开发服务器...');
    child.kill('SIGTERM');
    setTimeout(() => {
      if (!child.killed) {
        child.kill('SIGKILL');
      }
      process.exit(0);
    }, 5000);
  });

  return child;
}

// 主函数
async function main() {
  console.log('🎯 FastBuild 智能开发服务器启动器\n');

  try {
    // 检查并清理端口
    await checkPorts();

    // 启动开发服务器
    startDevServer();

  } catch (error) {
    console.error('❌ 启动失败:', error.message);
    console.log('\n💡 手动解决方案:');
    console.log('1. 运行 pnpm clean-ports:force');
    console.log('2. 运行 pnpm dev');
    console.log('3. 运行 pnpm dev-manager start\n');
    process.exit(1);
  }
}

// 显示帮助信息
function showHelp() {
  console.log(`
智能开发服务器启动器

用法:
  pnpm start-dev     # 智能启动开发服务器
  pnpm start-dev help # 显示帮助信息

功能:
  🔍 自动检测端口占用
  🧹 自动清理占用端口
  🚀 启动开发服务器
  📡 优雅关闭处理

其他命令:
  pnpm dev              # 标准启动
  pnpm dev:check        # 检查端口后启动
  pnpm dev:clean        # 清理端口后启动
  pnpm dev:reload       # 强制清理并重启
  pnpm dev-manager      # 开发服务器管理器
`);
}

// 处理命令行参数
if (process.argv.includes('help') || process.argv.includes('-h') || process.argv.includes('--help')) {
  showHelp();
  process.exit(0);
}

// 启动
if (require.main === module) {
  main();
}

module.exports = {
  checkPorts,
  startDevServer
};