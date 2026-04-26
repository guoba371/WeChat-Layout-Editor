import React from 'react';
import { createRoot } from 'react-dom/client';
import { Moon } from 'lucide-react';
import './styles.css';

function App() {
  return (
    <main className="app-shell">
      <section className="glass-panel starter-card">
        <div className="starter-icon" aria-hidden="true">
          <Moon size={20} />
        </div>
        <p className="starter-eyebrow">FlowCast Clone</p>
        <h1>灵感流转，由此开始</h1>
        <p className="starter-copy">
          基础配置与全局视觉变量已就绪。下一阶段将接入顶部工具栏、三栏工作台与主题面板。
        </p>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
