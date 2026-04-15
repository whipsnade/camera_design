# 摄像头平面图自动布点系统

本项目用于构建一个本地浏览器原型，支持导入门店 `DWG` 平面图、按覆盖距离自动计算摄像头数量与点位、人工微调，并导出标注后的 PNG/JPG/PDF 交付图。

当前状态：已完成可用原型，当前主流程以 `DWG` 导入为入口。

## 快速启动

在启动前，请先确保本机可用 `dwgread` 命令（来自 LibreDWG），并且它已经在 `PATH` 中。后端的 DWG 导入会直接调用它读取图纸实体。

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

> 说明：当前工作台的上传入口已切换为 `DWG` 导入。比例与单位会优先从 DWG 元数据读取，读取不可靠时再走手工校准。

## 验证状态

- [x] 后端测试通过
- [x] 前端测试通过
- [x] 真实样例 DWG 导入并完成自动布点
- [x] 锁定相机后重算
- [x] 导出 PNG / PDF / 项目文件

## 输出目录

导出后的项目文件和交付图会写入 `data/projects/<项目ID>/`。

相关文档：

- 设计规格：`docs/superpowers/specs/2026-04-09-camera-layout-design.md`
- 实施计划：`docs/superpowers/plans/2026-04-09-camera-layout-implementation.md`
