#!/usr/bin/env node

/**
 * 端口清理脚本
 * 清理开发环境占用的端口，确保服务器可以正常启动
 */

const { killPortProcess, isPortInUse } = require('./check-ports');

// 端口配置
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

// 交互式确认
function confirm(message) {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`${message} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

// 清理指定端口
async function cleanPort(port, name, force = false) {
  const serviceName = PORT_NAMES[port] || name || `端口 ${port}`;

  if (!isPortInUse(port)) {
    console.log(`✅ ${serviceName} 未被占用`);
    return true;
  }

  console.log(`🔍 发现 ${serviceName} 被占用`);

  if (!force) {
    const shouldKill = await confirm(`是否终止 ${serviceName} 的占用进程？`);
    if (!shouldKill) {
      console.log(`⏭️  跳过 ${serviceName}`);
      return false;
    }
  }

  const success = killPortProcess(port);
  if (success) {
    console.log(`✅ ${serviceName} 已清理`);
    return true;
  } else {
    console.log(`❌ ${serviceName} 清理失败，请手动处理`);
    return false;
  }
}

// 清理所有端口
async function cleanAllPorts(force = false) {
  console.log('🧹 开始清理开发环境端口...\n');

  const results = [];

  // 清理数据库相关端口
  if (isPortInUse(PORTS.db)) {
    const success = await cleanPort(PORTS.db, 'PostgreSQL Database', force);
    results.push({ port: PORTS.db, success, name: 'PostgreSQL Database' });
  }

  // 清理开发服务器端口
  if (isPortInUse(PORTS.web)) {
    const success = await cleanPort(PORTS.web, 'Next.js Web Server', force);
    results.push({ port: PORTS.web, success, name: 'Next.js Web Server' });
  }

  // 清理 Prisma Studio 端口
  if (isPortInUse(PORTS.studio)) {
    const success = await cleanPort(PORTS.studio, 'Prisma Studio', force);
    results.push({ port: PORTS.studio, success, name: 'Prisma Studio' });
  }

  console.log('\n📋 清理结果:');
  results.forEach(({ port, success, name }) => {
    const status = success ? '✅ 成功' : '❌ 失败';
    console.log(`   ${status}: ${name} (端口 ${port})`);
  });

  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;

  console.log(`\n🎉 清理完成: ${successCount}/${totalCount} 个端口已清理`);

  if (successCount === totalCount) {
    console.log('🚀 所有端口已清理，可以安全启动开发服务器');
  } else {
    console.log('⚠️  部分端口清理失败，请检查并手动处理');
    process.exit(1);
  }
}

// 清理特定端口
async function cleanSpecificPort(port, force = false) {
  const portNumber = parseInt(port);
  if (isNaN(portNumber)) {
    console.error(`❌ 无效的端口号: ${port}`);
    process.exit(1);
  }

  const success = await cleanPort(portNumber, `端口 ${portNumber}`, force);
  if (!success) {
    process.exit(1);
  }
}

// 显示帮助信息
function showHelp() {
  console.log(`
端口清理脚本

用法:
  pnpm clean-ports [选项]

选项:
  --force       强制清理，不询问确认
  --port <端口> 清理指定端口
  --help        显示帮助信息

示例:
  pnpm clean-ports              # 交互式清理所有端口
  pnpm clean-ports --force      # 强制清理所有端口
  pnpm clean-ports --port 3000  # 清理指定端口
`);
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  let force = false;
  let specificPort = null;

  // 解析命令行参数
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--force') {
      force = true;
    } else if (arg === '--port' && i + 1 < args.length) {
      specificPort = args[i + 1];
      i++;
    } else if (arg === '--help') {
      showHelp();
      return;
    }
  }

  if (force) {
    console.log('⚠️  强制模式已启用，将不询问确认\n');
  }

  try {
    if (specificPort) {
      await cleanSpecificPort(specificPort, force);
    } else {
      await cleanAllPorts(force);
    }
  } catch (error) {
    console.error('❌ 清理过程中出现错误:', error.message);
    process.exit(1);
  }
}

// 如果作为主模块运行
if (require.main === module) {
  main();
}

module.exports = {
  cleanPort,
  cleanAllPorts,
  cleanSpecificPort,
};