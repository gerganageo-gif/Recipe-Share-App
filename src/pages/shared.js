import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import 'bootstrap-icons/font/bootstrap-icons.css';
import '../styles/main.css';

import { APP_NAME, hasSupabaseConfig } from '../config';
import { renderNavbar } from '../components/navbar';

export async function setupPage({ title }) {
  if (title) {
    document.title = `${title} | ${APP_NAME}`;
  }

  await renderNavbar();

  const configWarning = document.querySelector('#config-warning');

  if (configWarning && !hasSupabaseConfig()) {
    configWarning.innerHTML = `
      <div class="alert alert-warning d-flex align-items-center gap-2" role="alert">
        <i class="bi bi-exclamation-triangle"></i>
        <span>Липсва .env конфигурация за Supabase. Копирай <strong>.env.example</strong> в <strong>.env</strong> и попълни ключовете.</span>
      </div>
    `;
  }
}
