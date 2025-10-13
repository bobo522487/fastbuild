# GitHub Actions 工具集

这个目录包含了项目 GitHub Actions 工作流的自定义工具和配置，旨在提供统一、可维护的 CI/CD 环境。

## 🎯 目标

- **DRY 原则**: 消除重复的环境配置代码
- **一致性**: 确保所有工作流使用相同的环境和工具版本
- **维护性**: 集中管理环境配置，便于更新和维护
- **标准化**: 提供标准化的开发、测试和部署流程

## 📦 组件结构

```
tooling/github/
├── package.json          # 包配置
├── setup/
│   └── action.yml        # 环境设置 Action
└── README.md            # 本文档
```

## 🚀 setup Action

`setup/action.yml` 提供了统一的环境设置步骤，包括：

### 功能特性

- ✅ **Node.js 版本管理**: 使用 `.nvmrc` 文件指定的版本
- ✅ **pnpm 包管理器**: 安装并配置 pnpm
- ✅ **Turbo 构建**: 全局安装 Turborepo 工具
- ✅ **依赖安装**: 安装项目依赖
- ✅ **缓存优化**: 自动配置包缓存

### 使用方法

#### 基本用法

```yaml
steps:
  - name: Checkout
    uses: actions/checkout@v4

  - name: Setup environment
    uses: ./tooling/github/setup@main

  - name: Run commands
    run: pnpm build
```

#### 在不同 job 中使用

```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./tooling/github/setup@main
      - run: pnpm biome:check

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./tooling/github/setup@main
      - run: pnpm test
```

## 📈 优化效果

### 优化前 (重复代码)

```yaml
# 每个 job 都需要重复这些步骤
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '22.20.0'
    cache: 'pnpm'

- name: Setup pnpm
  uses: pnpm/action-setup@v4
  with:
    version: '10.15.1'

- name: Install dependencies
  run: pnpm install --frozen-lockfile
```

### 优化后 (简洁)

```yaml
# 只需要一行
- name: Setup environment
  uses: ./tooling/github/setup@main
```

### 统计对比

| 指标 | 优化前 | 优化后 | 改善 |
|------|--------|--------|------|
| 代码行数 | 12 行/job | 1 行/job | 91% ↓ |
| 维护点 | 4 个 | 1 个 | 75% ↓ |
| 一致性风险 | 高 | 低 | 显著改善 |
| 更新成本 | 4 处 | 1 处 | 75% ↓ |

## 🔧 配置选项

### 环境变量

以下环境变量会影响 setup action 的行为：

```bash
# Node.js 版本 (通过 .nvmrc 文件)
NODE_VERSION=22.20.0

# pnpm 版本 (通过 pnpm-lock.yaml 自动检测)
PNPM_VERSION=10.15.1
```

### 自定义配置

如需自定义设置，可以修改 `action.yml` 文件：

```yaml
runs:
  using: composite
  steps:
    - uses: pnpm/action-setup@v4
    - uses: actions/setup-node@v5
      with:
        node-version-file: ".nvmrc"
        cache: "pnpm"

    - name: Install global dependencies
      shell: bash
      run: |
        pnpm add -g turbo
        # 添加其他全局工具...

    - name: Install project dependencies
      shell: bash
      run: pnpm install
```

## 🛠️ 扩展功能

### 添加新的全局工具

如果需要安装额外的全局工具，可以修改 action.yml：

```yaml
- shell: bash
  run: |
    pnpm add -g turbo
    pnpm add -g @typescript-eslint/cli  # 新增 ESLint
    pnpm add -g prettier                 # 新增 Prettier
    pnpm install
```

### 添加环境检查

可以在 setup action 中添加环境验证：

```yaml
- name: Verify environment
  shell: bash
  run: |
    node --version
    pnpm --version
    turbo --version

- name: Cache verification
  shell: bash
  run: |
    echo "Node cache hit: ${{ steps.setup-node.outputs.cache-hit }}"
    echo "pnpm cache hit: ${{ steps.setup-pnpm.outputs.cache-hit }}"
```

## 📊 工作流集成

### 完整的工作流示例

```yaml
name: Optimized CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./tooling/github/setup@main
      - run: pnpm biome:check

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:17
        env:
          POSTGRES_PASSWORD: postgres
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4
      - uses: ./tooling/github/setup@main
      - run: pnpm test:coverage

  build:
    runs-on: ubuntu-latest
    needs: [lint, test]
    steps:
      - uses: actions/checkout@v4
      - uses: ./tooling/github/setup@main
      - run: pnpm build
```

### 矩阵构建

```yaml
jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node-version: [20.x, 22.x]

    steps:
      - uses: actions/checkout@v4
      - uses: ./tooling/github/setup@main
      - run: pnpm test
```

## 🔍 故障排除

### 常见问题

1. **Action 找不到**: 确保使用正确的路径 `./tooling/github/setup@main`
2. **权限问题**: 确保工作流有足够的权限执行操作
3. **缓存问题**: 检查缓存配置和密钥是否正确

### 调试步骤

1. **启用调试日志**:

```yaml
- name: Setup environment
  uses: ./tooling/github/setup@main
  env:
    ACTIONS_STEP_DEBUG: true
```

2. **检查环境变量**:

```yaml
- name: Debug environment
  run: |
    echo "Node version: $(node --version)"
    echo "pnpm version: $(pnpm --version)"
    echo "Turbo version: $(turbo --version)"
```

### 日志分析

查看 setup action 的输出日志，确认：

- ✅ Node.js 安装成功
- ✅ pnpm 配置正确
- ✅ 依赖安装完成
- ✅ 缓存命中状态
- ✅ 环境变量设置正确

## 🎯 最佳实践

### 版本管理

- 使用 `.nvmrc` 文件管理 Node.js 版本
- 通过 `pnpm-lock.yaml` 锁定依赖版本
- 定期更新工具版本以获取安全修复

### 性能优化

- 启用包缓存以减少下载时间
- 使用矩阵构建并行执行任务
- 缓存构建产物以加速后续构建

### 安全考虑

- 定期更新 Action 版本
- 使用受信任的 Action 来源
- 限制工作流的权限范围

## 📝 维护指南

### 更新工具版本

1. 修改 `.nvmrc` 文件更新 Node.js 版本
2. 更新 `pnpm-lock.yaml` 中的 pnpm 版本
3. 测试所有工作流确保兼容性

### 添加新功能

1. 在 `action.yml` 中添加新的步骤
2. 更新相关文档
3. 在测试环境中验证功能

### 监控和优化

- 监控工作流执行时间
- 分析缓存命中率
- 根据需要调整配置

## 🔄 迁移指南

### 从传统工作流迁移

1. **识别重复设置**: 查找所有 job 中的 Node.js 和 pnpm 设置
2. **替换为统一 action**: 用 `./tooling/github/setup@main` 替换重复代码
3. **测试验证**: 确保所有工作流正常运行
4. **文档更新**: 更新相关文档和注释

### 迁移检查清单

- [ ] 更新所有 CI/CD 工作流
- [ ] 测试 lint、test、build 等 job
- [ ] 验证缓存功能正常
- [ ] 检查安全扫描结果
- [ ] 更新团队文档
- [ ] 通知团队成员变更

## 📞 支持

如需帮助或遇到问题，请：

1. 检查本文档的故障排除部分
2. 查看工作流执行日志
3. 创建 GitHub Issue 描述问题
4. 联系 DevOps 团队获取支持

## 📄 许可证

本工具集遵循项目的 MIT 许可证。