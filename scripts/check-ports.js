#!/usr/bin/env node

/**
 * 端口检测脚本
 * 检测开发环境端口占用情况，避免启动冲突
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 配置的端口
const PORTS = {
  web: 3000,
  api: 3001,
  db: 5432,
  studio: 5555,
};

const PORT_NAMES = {
  [PORTS.web]: 'Next.js Web Server',
  [PORTS.api]: 'API Server',
  [PORTS.db]: 'PostgreSQL Database',
  [PORTS.studio]: 'Prisma Studio',
};

// 检测端口是否被占用
function isPortInUse(port) {
  try {
    if (process.platform === 'win32') {
      // Windows 使用 netstat，但忽略 TIME_WAIT 状态的连接
      const result = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
      const lines = result.split('\n').filter(line => line.trim());

      // 检查是否有非 TIME_WAIT 状态的连接
      const hasActiveConnection = lines.some(line => {
        return line.includes('LISTENING') || line.includes('ESTABLISHED');
      });

      return hasActiveConnection;
    } else {
      // macOS/Linux 使用 lsof
      const result = execSync(`lsof -i :${port}`, { encoding: 'utf8' });
      return result.trim().length > 0;
    }
  } catch (error) {
    // 端口未被占用
    return false;
  }
}

// 获取占用端口的进程信息
function getPortProcess(port) {
  try {
    if (process.platform === 'win32') {
      const result = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
      const lines = result.split('\n').filter(line => line.trim());

      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];

        if (pid && pid !== '0') {
          try {
            const processInfo = execSync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`, { encoding: 'utf8' });
            const processName = processInfo.split('","')[0].replace('"', '');
            return { pid, name: processName };
          } catch (e) {
            return { pid, name: 'Unknown Process' };
          }
        }
      }
    } else {
      const result = execSync(`lsof -i :${port} -t`, { encoding: 'utf8' });
      const pid = result.trim();

      if (pid) {
        try {
          const processInfo = execSync(`ps -p ${pid} -o comm=`, { encoding: 'utf8' });
          return { pid, name: processInfo.trim() };
        } catch (e) {
          return { pid, name: 'Unknown Process' };
        }
      }
    }
  } catch (error) {
    return null;
  }

  return null;
}

// 终止占用端口的进程
function killPortProcess(port) {
  const process = getPortProcess(port);
  if (!process) return false;

  try {
    if (process.platform === 'win32') {
      // Windows下使用多种方法尝试终止进程
      try {
        // 方法1: 使用taskkill
        execSync(`taskkill //F //PID ${process.pid}`, { stdio: 'pipe' });
        console.log(`   使用taskkill终止进程 ${process.pid}`);
      } catch (e1) {
        try {
          // 方法2: 使用PowerShell
          execSync(`powershell -Command "Stop-Process -Id ${process.pid} -Force"`, { stdio: 'pipe' });
          console.log(`   使用PowerShell终止进程 ${process.pid}`);
        } catch (e2) {
          try {
            // 方法3: 使用wmic
            execSync(`wmic process where "ProcessId=${process.pid}" delete`, { stdio: 'pipe' });
            console.log(`   使用wmic终止进程 ${process.pid}`);
          } catch (e3) {
            console.log(`   所有终止方法都失败了`);
            return false;
          }
        }
      }
    } else {
      // macOS/Linux
      execSync(`kill -9 ${process.pid}`, { stdio: 'pipe' });
    }
    return true;
  } catch (error) {
    console.log(`   终止进程时出错: ${error.message}`);
    return false;
  }
}

// 检查 .env 文件中的端口配置
function checkEnvConfig() {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    console.log('⚠️  .env 文件不存在，将使用默认端口配置');
    return;
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const portConfig = envContent.split('\n').filter(line =>
    line.includes('PORT') || line.includes('DATABASE_URL')
  );

  if (portConfig.length > 0) {
    console.log('📋 当前端口配置:');
    portConfig.forEach(config => {
      console.log(`   ${config}`);
    });
  }
}

// 主函数
function main() {
  console.log('🔍 检测开发环境端口占用情况...\n');

  checkEnvConfig();

  const occupiedPorts = [];

  // 检查所有配置的端口
  Object.entries(PORTS).forEach(([service, port]) => {
    const serviceName = PORT_NAMES[port] || service;

    if (isPortInUse(port)) {
      occupiedPorts.push({ service, port, name: serviceName });

      const process = getPortProcess(port);
      console.log(`❌ ${serviceName} (端口 ${port}) 被占用`);
      if (process) {
        console.log(`   进程: ${process.name} (PID: ${process.pid})`);
      }
    } else {
      console.log(`✅ ${serviceName} (端口 ${port}) 可用`);
    }
  });

  console.log('');

  // 如果有端口被占用，提供解决方案
  if (occupiedPorts.length > 0) {
    console.log('🛠️  解决方案:');
    console.log('1. 运行 pnpm clean-ports 自动清理占用端口');
    console.log('2. 手动终止占用进程');
    console.log('3. 修改 .env 文件中的端口配置\n');

    if (process.argv.includes('--fix')) {
      console.log('🔄 自动清理占用端口...');
      occupiedPorts.forEach(({ port, name }) => {
        const success = killPortProcess(port);
        if (success) {
          console.log(`✅ ${name} (端口 ${port}) 已清理`);
        } else {
          console.log(`❌ ${name} (端口 ${port}) 清理失败`);
        }
      });

      console.log('\n🎉 端口清理完成，可以启动开发服务器');
    } else {
      console.log('💡 使用 pnpm check-ports --fix 自动清理占用端口');
      process.exit(1);
    }
  } else {
    console.log('🎉 所有端口都可用，可以启动开发服务器');
  }
}

// 如果作为主模块运行
if (require.main === module) {
  main();
}

module.exports = {
  isPortInUse,
  getPortProcess,
  killPortProcess,
  PORTS,
};