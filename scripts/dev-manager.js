#!/usr/bin/env node

/**
 * 开发服务器管理器
 * 统一管理所有开发服务器，提供优雅的启动和关闭功能
 */

const { spawn } = require('child_process');
const { isPortInUse, getPortProcess } = require('./check-ports');
const path = require('path');
const fs = require('fs');

const PROJECT_ROOT = process.cwd();
const DEVSERVICES_JSON = path.join(PROJECT_ROOT, '.devservices.json');

// 服务配置
const SERVICES = {
  database: {
    name: 'PostgreSQL Database',
    port: 5432,
    start: () => startDatabase(),
    stop: () => stopDatabase(),
    check: () => checkDatabase(),
  },
  web: {
    name: 'Next.js Web Server',
    port: 3000,
    start: () => startWebServer(),
    stop: () => stopWebServer(),
    check: () => checkWebServer(),
  },
  api: {
    name: 'API Server',
    port: 3001,
    start: () => startApiServer(),
    stop: () => stopApiServer(),
    check: () => checkApiServer(),
  },
  studio: {
    name: 'Prisma Studio',
    port: 5555,
    start: () => startPrismaStudio(),
    stop: () => stopPrismaStudio(),
    check: () => checkPrismaStudio(),
  },
};

// 保存服务进程信息
let serviceProcesses = {};

// 读取开发服务状态
function loadDevServices() {
  try {
    if (fs.existsSync(DEVSERVICES_JSON)) {
      const data = fs.readFileSync(DEVSERVICES_JSON, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.warn('⚠️  无法读取开发服务状态文件:', error.message);
  }
  return {};
}

// 保存开发服务状态
function saveDevServices(data) {
  try {
    fs.writeFileSync(DEVSERVICES_JSON, JSON.stringify(data, null, 2));
  } catch (error) {
    console.warn('⚠️  无法保存开发服务状态:', error.message);
  }
}

// 启动数据库服务
function startDatabase() {
  console.log('🚀 启动数据库服务...');
  const process = spawn('docker', ['compose', 'up', '-d'], {
    cwd: PROJECT_ROOT,
    stdio: 'inherit',
  });

  serviceProcesses.database = process;
  return process;
}

// 停止数据库服务
function stopDatabase() {
  console.log('🛑 停止数据库服务...');
  const process = spawn('docker', ['compose', 'down'], {
    cwd: PROJECT_ROOT,
    stdio: 'inherit',
  });

  return process;
}

// 检查数据库服务状态
function checkDatabase() {
  return isPortInUse(5432);
}

// 启动 Web 服务器
function startWebServer() {
  console.log('🚀 启动 Next.js Web 服务器...');
  const process = spawn('pnpm', ['dev'], {
    cwd: path.join(PROJECT_ROOT, 'apps/web'),
    stdio: 'inherit',
    shell: true,
  });

  serviceProcesses.web = process;
  return process;
}

// 停止 Web 服务器
function stopWebServer() {
  console.log('🛑 停止 Next.js Web 服务器...');

  // 先尝试优雅关闭
  if (serviceProcesses.web) {
    serviceProcesses.web.kill('SIGTERM');
    setTimeout(() => {
      if (serviceProcesses.web && !serviceProcesses.web.killed) {
        serviceProcesses.web.kill('SIGKILL');
      }
    }, 5000);
  }

  // 如果还有进程占用端口，强制终止
  if (isPortInUse(3000)) {
    const { killPortProcess } = require('./check-ports');
    killPortProcess(3000);
  }

  return true;
}

// 检查 Web 服务器状态
function checkWebServer() {
  return isPortInUse(3000);
}

// 启动 API 服务器
function startApiServer() {
  console.log('🚀 启动 API 服务器...');
  const process = spawn('pnpm', ['dev:api'], {
    cwd: PROJECT_ROOT,
    stdio: 'inherit',
    shell: true,
  });

  serviceProcesses.api = process;
  return process;
}

// 停止 API 服务器
function stopApiServer() {
  console.log('🛑 停止 API 服务器...');

  if (serviceProcesses.api) {
    serviceProcesses.api.kill('SIGTERM');
  }

  if (isPortInUse(3001)) {
    const { killPortProcess } = require('./check-ports');
    killPortProcess(3001);
  }

  return true;
}

// 检查 API 服务器状态
function checkApiServer() {
  return isPortInUse(3001);
}

// 启动 Prisma Studio
function startPrismaStudio() {
  console.log('🚀 启动 Prisma Studio...');
  const process = spawn('pnpm', ['db:studio'], {
    cwd: PROJECT_ROOT,
    stdio: 'inherit',
    shell: true,
  });

  serviceProcesses.studio = process;
  return process;
}

// 停止 Prisma Studio
function stopPrismaStudio() {
  console.log('🛑 停止 Prisma Studio...');

  if (serviceProcesses.studio) {
    serviceProcesses.studio.kill('SIGTERM');
  }

  if (isPortInUse(5555)) {
    const { killPortProcess } = require('./check-ports');
    killPortProcess(5555);
  }

  return true;
}

// 检查 Prisma Studio 状态
function checkPrismaStudio() {
  return isPortInUse(5555);
}

// 启动所有服务
async function startAllServices() {
  console.log('🚀 启动所有开发服务...\n');

  const results = [];

  // 按顺序启动服务
  for (const [key, service] of Object.entries(SERVICES)) {
    console.log(`\n📋 启动 ${service.name}...`);

    try {
      const process = service.start();

      if (process) {
        process.on('exit', (code) => {
          console.log(`⚠️  ${service.name} 进程已退出，代码: ${code}`);
          delete serviceProcesses[key];
        });
      }

      // 等待服务启动
      await new Promise(resolve => setTimeout(resolve, 2000));

      const isRunning = service.check();
      if (isRunning) {
        console.log(`✅ ${service.name} 启动成功`);
        results.push({ service: key, status: 'success' });
      } else {
        console.log(`❌ ${service.name} 启动失败`);
        results.push({ service: key, status: 'failed' });
      }
    } catch (error) {
      console.error(`❌ ${service.name} 启动错误:`, error.message);
      results.push({ service: key, status: 'error', error: error.message });
    }
  }

  console.log('\n📊 启动结果:');
  results.forEach(({ service, status }) => {
    const serviceName = SERVICES[service].name;
    const statusIcon = status === 'success' ? '✅' : '❌';
    console.log(`   ${statusIcon} ${serviceName}`);
  });

  // 保存服务状态
  saveDevServices({
    startTime: new Date().toISOString(),
    services: results,
  });
}

// 停止所有服务
async function stopAllServices() {
  console.log('🛑 停止所有开发服务...\n');

  const results = [];

  // 反向顺序停止服务
  for (const [key, service] of Object.entries(SERVICES).reverse()) {
    console.log(`\n📋 停止 ${service.name}...`);

    try {
      const success = service.stop();

      if (success) {
        console.log(`✅ ${service.name} 停止成功`);
        results.push({ service: key, status: 'success' });
      } else {
        console.log(`❌ ${service.name} 停止失败`);
        results.push({ service: key, status: 'failed' });
      }
    } catch (error) {
      console.error(`❌ ${service.name} 停止错误:`, error.message);
      results.push({ service: key, status: 'error', error: error.message });
    }
  }

  console.log('\n📊 停止结果:');
  results.forEach(({ service, status }) => {
    const serviceName = SERVICES[service].name;
    const statusIcon = status === 'success' ? '✅' : '❌';
    console.log(`   ${statusIcon} ${serviceName}`);
  });

  // 清理服务状态
  if (fs.existsSync(DEVSERVICES_JSON)) {
    fs.unlinkSync(DEVSERVICES_JSON);
  }
}

// 检查所有服务状态
function checkAllServices() {
  console.log('🔍 检查所有服务状态...\n');

  const devServices = loadDevServices();
  const results = [];

  for (const [key, service] of Object.entries(SERVICES)) {
    const isRunning = service.check();
    const status = isRunning ? 'running' : 'stopped';

    const statusIcon = isRunning ? '🟢' : '🔴';
    console.log(`${statusIcon} ${service.name}: ${status}`);

    if (isRunning) {
      const processInfo = getPortProcess(service.port);
      if (processInfo) {
        console.log(`   进程: ${processInfo.name} (PID: ${processInfo.pid})`);
      }
    }

    results.push({ service: key, status });
  }

  // 显示启动时间
  if (devServices.startTime) {
    const startTime = new Date(devServices.startTime);
    const uptime = Date.now() - startTime;
    const hours = Math.floor(uptime / 3600000);
    const minutes = Math.floor((uptime % 3600000) / 60000);

    console.log(`\n⏱️  运行时间: ${hours}小时 ${minutes}分钟`);
    console.log(`🕐 启动时间: ${startTime.toLocaleString()}`);
  }

  return results;
}

// 优雅退出处理
function setupGracefulShutdown() {
  const shutdown = async (signal) => {
    console.log(`\n📡 收到 ${signal} 信号，正在优雅关闭...`);

    try {
      await stopAllServices();
      console.log('🎉 所有服务已安全关闭');
      process.exit(0);
    } catch (error) {
      console.error('❌ 关闭服务时出错:', error.message);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGQUIT', () => shutdown('SIGQUIT'));
}

// 显示帮助信息
function showHelp() {
  console.log(`
开发服务器管理器

用法:
  pnpm dev-manager [命令]

命令:
  start     启动所有开发服务
  stop      停止所有开发服务
  restart   重启所有开发服务
  status    查看所有服务状态
  help      显示帮助信息

示例:
  pnpm dev-manager start     # 启动所有服务
  pnpm dev-manager stop      # 停止所有服务
  pnpm dev-manager status   # 查看服务状态
`);
}

// 主函数
async function main() {
  const command = process.argv[2] || 'status';

  switch (command) {
    case 'start':
      setupGracefulShutdown();
      await startAllServices();
      break;

    case 'stop':
      await stopAllServices();
      break;

    case 'restart':
      console.log('🔄 重启所有服务...\n');
      await stopAllServices();
      await new Promise(resolve => setTimeout(resolve, 2000));
      setupGracefulShutdown();
      await startAllServices();
      break;

    case 'status':
      checkAllServices();
      break;

    case 'help':
      showHelp();
      break;

    default:
      console.error(`❌ 未知命令: ${command}`);
      showHelp();
      process.exit(1);
  }
}

// 如果作为主模块运行
if (require.main === module) {
  main();
}

module.exports = {
  startAllServices,
  stopAllServices,
  checkAllServices,
  SERVICES,
};