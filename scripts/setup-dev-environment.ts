#!/usr/bin/env ts-node

/**
 * 开发环境设置脚本
 * 自动配置开发环境和工具链
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

interface SetupOptions {
  installDependencies: boolean;
  setupGitHooks: boolean;
  setupVSCode: boolean;
  setupIDE: boolean;
  runTests: boolean;
  verbose: boolean;
}

class DevEnvironmentSetup {
  private options: SetupOptions;
  private projectRoot: string;

  constructor(options: Partial<SetupOptions> = {}) {
    this.options = {
      installDependencies: true,
      setupGitHooks: true,
      setupVSCode: true,
      setupIDE: true,
      runTests: false,
      verbose: false,
      ...options,
    };
    this.projectRoot = process.cwd();
  }

  /**
   * 运行完整的环境设置
   */
  async runSetup(): Promise<{
    success: boolean;
    message: string;
    warnings: string[];
    errors: string[];
  }> {
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      console.log('🚀 开始设置开发环境...');

      // 检查系统要求
      const systemCheck = this.checkSystemRequirements();
      warnings.push(...systemCheck.warnings);
      errors.push(...systemCheck.errors);

      if (systemCheck.errors.length > 0) {
        return {
          success: false,
          message: '系统要求检查失败',
          warnings,
          errors,
        };
      }

      // 安装依赖
      if (this.options.installDependencies) {
        console.log('📦 安装依赖包...');
        const installResult = this.installDependencies();
        warnings.push(...installResult.warnings);
        errors.push(...installResult.errors);
      }

      // 设置 Git Hooks
      if (this.options.setupGitHooks) {
        console.log('🪝 设置 Git Hooks...');
        const gitHooksResult = this.setupGitHooks();
        warnings.push(...gitHooksResult.warnings);
        errors.push(...gitHooksResult.errors);
      }

      // 设置 VS Code
      if (this.options.setupVSCode) {
        console.log('💻 设置 VS Code...');
        const vsCodeResult = this.setupVSCode();
        warnings.push(...vsCodeResult.warnings);
        errors.push(...vsCodeResult.errors);
      }

      // 设置 IDE
      if (this.options.setupIDE) {
        console.log('🛠️ 设置 IDE 配置...');
        const ideResult = this.setupIDE();
        warnings.push(...ideResult.warnings);
        errors.push(...ideResult.errors);
      }

      // 运行测试
      if (this.options.runTests) {
        console.log('🧪 运行测试...');
        const testResult = this.runTests();
        warnings.push(...testResult.warnings);
        errors.push(...testResult.errors);
      }

      // 生成配置文件
      console.log('⚙️ 生成配置文件...');
      const configResult = this.generateConfigFiles();
      warnings.push(...configResult.warnings);
      errors.push(...configResult.errors);

      // 创建目录结构
      console.log('📁 创建目录结构...');
      const dirsResult = this.createDirectoryStructure();
      warnings.push(...dirsResult.warnings);
      errors.push(...dirsResult.errors);

      // 设置环境变量
      console.log('🌍 设置环境变量...');
      const envResult = this.setupEnvironment();
      warnings.push(...envResult.warnings);
      errors.push(...envResult.errors);

      const success = errors.length === 0;
      const message = success ? '开发环境设置完成！' : '开发环境设置完成，但有一些问题需要处理';

      return {
        success,
        message,
        warnings,
        errors,
      };

    } catch (error) {
      errors.push(`设置失败: ${error instanceof Error ? error.message : '未知错误'}`);
      return {
        success: false,
        message: '开发环境设置失败',
        warnings,
        errors,
      };
    }
  }

  /**
   * 检查系统要求
   */
  private checkSystemRequirements(): {
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      // 检查 Node.js 版本
      try {
        const nodeVersion = execSync('node --version', { encoding: 'utf-8' });
        const version = nodeVersion.trim().replace('v', '');
        const majorVersion = parseInt(version.split('.')[0]);

        if (majorVersion < 18) {
          errors.push(`Node.js 版本过低，需要 18.0.0 或更高版本，当前版本: ${version}`);
        } else {
          console.log(`✅ Node.js 版本: ${version}`);
        }
      } catch (error) {
        errors.push('未找到 Node.js，请先安装 Node.js');
      }

      // 检查 pnpm
      try {
        const pnpmVersion = execSync('pnpm --version', { encoding: 'utf-8' });
        console.log(`✅ pnpm 版本: ${pnpmVersion.trim()}`);
      } catch (error) {
        warnings.push('未找到 pnpm，建议使用 pnpm 作为包管理器');
      }

      // 检查 Git
      try {
        const gitVersion = execSync('git --version', { encoding: 'utf-8' });
        console.log(`✅ Git 版本: ${gitVersion.trim()}`);
      } catch (error) {
        errors.push('未找到 Git，请先安装 Git');
      }

      // 检查 Docker (可选)
      try {
        const dockerVersion = execSync('docker --version', { encoding: 'utf-8' });
        console.log(`✅ Docker 版本: ${dockerVersion.trim()}`);
      } catch (error) {
        warnings.push('未找到 Docker，Docker 是可选的，用于数据库开发');
      }

    } catch (error) {
      errors.push(`系统检查失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }

    return { warnings, errors };
  }

  /**
   * 安装依赖
   */
  private installDependencies(): {
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      // 安装根目录依赖
      execSync('pnpm install', { stdio: 'inherit' });

      // 构建所有包
      execSync('pnpm build', { stdio: 'inherit' });

      console.log('✅ 依赖安装完成');

    } catch (error) {
      errors.push(`依赖安装失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }

    return { warnings, errors };
  }

  /**
   * 设置 Git Hooks
   */
  private setupGitHooks(): {
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      // 检查是否是 Git 仓库
      try {
        execSync('git rev-parse --is-inside-work-tree', { stdio: 'pipe' });
      } catch (error) {
        warnings.push('不是 Git 仓库，跳过 Git Hooks 设置');
        return { warnings, errors };
      }

      // 设置 Husky
      execSync('npx husky install', { stdio: 'inherit' });

      // 添加 pre-commit hook
      execSync('npx husky add .husky/pre-commit "pnpm lint-staged"', { stdio: 'inherit' });

      // 添加 commit-msg hook
      execSync('npx husky add .husky/commit-msg "pnpm commitlint --edit $1"', { stdio: 'inherit' });

      console.log('✅ Git Hooks 设置完成');

    } catch (error) {
      warnings.push(`Git Hooks 设置失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }

    return { warnings, errors };
  }

  /**
   * 设置 VS Code
   */
  private setupVSCode(): {
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      const vscodeDir = join(this.projectRoot, '.vscode');

      if (!existsSync(vscodeDir)) {
        mkdirSync(vscodeDir);
      }

      // 创建 settings.json
      const settings = {
        "editor.formatOnSave": true,
        "editor.codeActionsOnSave": {
          "source.fixAll.eslint": true
        },
        "typescript.preferences.preferTypeOnlyAutoImports": true,
        "typescript.updateImportsOnFileMove.enabled": "always",
        "files.associations": {
          "*.css": "tailwindcss"
        },
        "tailwindCSS.includeLanguages": {
          "typescript": "javascript",
          "typescriptreact": "javascript"
        },
        "editor.quickSuggestions": {
          "strings": true,
          "comments": true,
          "other": true
        },
        "eslint.validate": [
          "javascript",
          "javascriptreact",
          "typescript",
          "typescriptreact"
        ]
      };

      writeFileSync(join(vscodeDir, 'settings.json'), JSON.stringify(settings, null, 2));

      // 创建 extensions.json
      const extensions = {
        "recommendations": [
          "bradlc.vscode-tailwindcss",
          "dbaeumer.vscode-eslint",
          "esbenp.prettier-vscode",
          "ms-vscode.vscode-typescript-next",
          "bradlc.vscode-tailwindcss",
          "ms-vscode.vscode-json",
          "ms-vscode.vscode-eslint"
        ]
      };

      writeFileSync(join(vscodeDir, 'extensions.json'), JSON.stringify(extensions, null, 2));

      console.log('✅ VS Code 配置完成');

    } catch (error) {
      errors.push(`VS Code 设置失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }

    return { warnings, errors };
  }

  /**
   * 设置 IDE 配置
   */
  private setupIDE(): {
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      // 创建 .editorconfig
      const editorConfig = `# EditorConfig is awesome: https://EditorConfig.org

# top-most EditorConfig file
root = true

# Unix-style newlines with a newline ending every file
[*]
end_of_line = lf
insert_final_newline = true
charset = utf-8
trim_trailing_whitespace = true

# JavaScript, JSX, TS, TSX
[*.{js,jsx,ts,tsx}]
indent_style = space
indent_size = 2

# JSON
[*.{json,jsonc}]
indent_style = space
indent_size = 2

# Markdown
[*.md]
trim_trailing_whitespace = false

# YAML
[*.{yml,yaml}]
indent_style = space
indent_size = 2

# Docker
[Dockerfile]
indent_style = space
indent_size = 2
`;

      writeFileSync(join(this.projectRoot, '.editorconfig'), editorConfig);

      console.log('✅ IDE 配置完成');

    } catch (error) {
      errors.push(`IDE 设置失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }

    return { warnings, errors };
  }

  /**
   * 运行测试
   */
  private runTests(): {
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      execSync('pnpm test', { stdio: 'inherit' });
      console.log('✅ 测试运行完成');

    } catch (error) {
      warnings.push(`测试运行失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }

    return { warnings, errors };
  }

  /**
   * 生成配置文件
   */
  private generateConfigFiles(): {
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      // 生成 .env.example
      const envExample = `# 数据库配置
DATABASE_URL="postgresql://fastbuild_user:fastbuild_password@localhost:5432/fastbuild"

# NextAuth 配置
NEXTAUTH_SECRET="your-nextauth-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# CSRF 保护
CSRF_SECRET="your-csrf-secret-here"

# Redis 配置 (可选)
REDIS_URL="redis://localhost:6379"

# 邮件配置 (可选)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-email-password"

# 文件上传配置
MAX_FILE_SIZE="10485760"  # 10MB
ALLOWED_FILE_TYPES="jpg,jpeg,png,gif,pdf,doc,docx"

# 安全配置
BLOCKED_IPS=""
ALLOWED_IPS="127.0.0.1,::1"
ALLOWED_USERS=""

# 速率限制配置
RATE_LIMIT_REQUESTS="100"
RATE_LIMIT_WINDOW="60000"

# 开发配置
NODE_ENV="development"
DEBUG="true"
`;

      writeFileSync(join(this.projectRoot, '.env.example'), envExample);

      // 如果 .env 不存在，复制 .env.example
      if (!existsSync(join(this.projectRoot, '.env'))) {
        writeFileSync(join(this.projectRoot, '.env'), envExample);
        console.log('✅ 创建了 .env 文件');
      }

      console.log('✅ 配置文件生成完成');

    } catch (error) {
      errors.push(`配置文件生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }

    return { warnings, errors };
  }

  /**
   * 创建目录结构
   */
  private createDirectoryStructure(): {
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      const directories = [
        'docs',
        'scripts',
        'tools',
        'apps/web/docs',
        'apps/web/public/images',
        'packages/ui/src/components',
        'packages/database/src',
        'packages/schema-compiler/src',
        'packages/types/src',
      ];

      directories.forEach(dir => {
        const fullPath = join(this.projectRoot, dir);
        if (!existsSync(fullPath)) {
          mkdirSync(fullPath, { recursive: true });
        }
      });

      console.log('✅ 目录结构创建完成');

    } catch (error) {
      errors.push(`目录结构创建失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }

    return { warnings, errors };
  }

  /**
   * 设置环境变量
   */
  private setupEnvironment(): {
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      // 设置 shell 配置文件
      const shellConfig = process.env.SHELL || '';
      let configPath = '';

      if (shellConfig.includes('zsh')) {
        configPath = join(homedir(), '.zshrc');
      } else if (shellConfig.includes('bash')) {
        configPath = join(homedir(), '.bashrc');
      }

      if (configPath && existsSync(configPath)) {
        const config = readFileSync(configPath, 'utf-8');

        // 添加环境变量（如果不存在）
        if (!config.includes('FASTBUILD_DEV')) {
          const envConfig = `\n# FastBuild 开发环境配置\nexport FASTBUILD_DEV=true\nexport PATH="$PATH:./node_modules/.bin"\n`;
          writeFileSync(configPath, config + envConfig);
          console.log(`✅ 环境变量已添加到 ${configPath}`);
        }
      }

    } catch (error) {
      warnings.push(`环境变量设置失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }

    return { warnings, errors };
  }
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  const options: Partial<SetupOptions> = {};

  // 解析命令行参数
  args.forEach(arg => {
    switch (arg) {
      case '--no-deps':
        options.installDependencies = false;
        break;
      case '--no-git':
        options.setupGitHooks = false;
        break;
      case '--no-vscode':
        options.setupVSCode = false;
        break;
      case '--no-ide':
        options.setupIDE = false;
        break;
      case '--run-tests':
        options.runTests = true;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--help':
        console.log(`
用法: ts-node setup-dev-environment.ts [选项]

选项:
  --no-deps       不安装依赖
  --no-git        不设置 Git Hooks
  --no-vscode     不设置 VS Code
  --no-ide        不设置 IDE 配置
  --run-tests     设置完成后运行测试
  --verbose       显示详细输出
  --help          显示帮助信息
        `);
        process.exit(0);
    }
  });

  const setup = new DevEnvironmentSetup(options);
  const result = await setup.runSetup();

  console.log('\n' + '='.repeat(50));
  console.log(`📊 设置结果: ${result.success ? '✅ 成功' : '❌ 失败'}`);
  console.log('='.repeat(50));

  if (result.warnings.length > 0) {
    console.log('\n⚠️  警告:');
    result.warnings.forEach(warning => console.log(`  - ${warning}`));
  }

  if (result.errors.length > 0) {
    console.log('\n❌ 错误:');
    result.errors.forEach(error => console.log(`  - ${error}`));
  }

  console.log(`\n📝 ${result.message}`);

  if (result.success) {
    console.log('\n🎉 开发环境设置完成！现在可以开始开发了。');
    console.log('💡 提示:');
    console.log('  - 运行 "pnpm dev" 启动开发服务器');
    console.log('  - 运行 "pnpm build" 构建项目');
    console.log('  - 运行 "pnpm lint" 检查代码质量');
    console.log('  - 运行 "pnpm test" 运行测试');
  }

  process.exit(result.success ? 0 : 1);
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(error => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  });
}

export { DevEnvironmentSetup };