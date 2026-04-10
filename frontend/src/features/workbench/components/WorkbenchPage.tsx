export function WorkbenchPage() {
  return (
    <main className="workbench-layout" aria-label="workbench layout">
      <aside className="workbench-panel workbench-panel--sidebar">上传图纸</aside>
      <section className="workbench-panel workbench-panel--canvas">图纸画布</section>
      <aside className="workbench-panel workbench-panel--sidebar">覆盖距离</aside>
    </main>
  );
}
