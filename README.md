# 摄像头平面图自动布点系统

本项目用于构建一个本地浏览器原型，支持上传门店平面图、按覆盖距离自动计算摄像头数量与点位、人工微调，并导出标注后的 PNG/JPG/PDF 交付图。

当前状态：已完成可用原型。

## 快速启动

1. 启动后端：

```bash
cd backend
.venv311/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

2. 启动前端：

```bash
cd frontend
npm run dev -- --host 127.0.0.1 --port 5173
```

3. 浏览器打开 `http://127.0.0.1:5173/`

前端开发环境会把 `/api/*` 代理到 `127.0.0.1:8000`，所以本地浏览器里就能直接完成上传、识别、重算和导出。

## 验证状态

- [x] 后端测试通过
- [x] 前端测试通过
- [x] 真实样例上传并完成自动识别
- [x] 锁定相机后重算
- [x] 导出 PNG / PDF / 项目文件

## 输出目录

导出后的项目文件和交付图会写入 `data/projects/<项目ID>/`。

相关文档：

- 设计规格：`docs/superpowers/specs/2026-04-09-camera-layout-design.md`
- 实施计划：`docs/superpowers/plans/2026-04-09-camera-layout-implementation.md`
