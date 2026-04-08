import { type ReactElement, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

function App(): ReactElement {
  return <div>绣花厂订单管理系统</div>;
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
