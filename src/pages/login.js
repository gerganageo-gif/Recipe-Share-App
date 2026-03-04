import { loginUser } from '../services/authService';
import { requireGuest } from '../utils/guards';
import { getPostLoginRedirectUrl } from '../utils/authRedirect';
import { clearInlineMessage, showInlineMessage } from '../utils/notifications';
import { setupPage } from './shared';

const form = document.querySelector('#login-form');
const statusMessage = document.querySelector('#status-message');
const submitButton = document.querySelector('#submit-btn');
const postLoginRedirectUrl = getPostLoginRedirectUrl();

await setupPage({ title: 'Вход' });

try {
  const existingUser = await requireGuest(postLoginRedirectUrl);

  if (existingUser) {
    return;
  }
} catch (error) {
  showInlineMessage(statusMessage, error.message, 'danger');
}

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearInlineMessage(statusMessage);

  const formData = new FormData(form);
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '').trim();

  if (!email || !password) {
    showInlineMessage(statusMessage, 'Имейлът и паролата са задължителни.', 'warning');
    return;
  }

  submitButton?.setAttribute('disabled', 'disabled');

  try {
    await loginUser({ email, password });
    showInlineMessage(statusMessage, 'Успешен вход. Пренасочване...', 'success');
    setTimeout(() => {
      window.location.href = postLoginRedirectUrl;
    }, 600);
  } catch (error) {
    showInlineMessage(statusMessage, error.message, 'danger');
  } finally {
    submitButton?.removeAttribute('disabled');
  }
});
