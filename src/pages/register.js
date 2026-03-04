import { registerUser } from '../services/authService';
import { requireGuest } from '../utils/guards';
import { clearInlineMessage, showInlineMessage } from '../utils/notifications';
import { setupPage } from './shared';

const form = document.querySelector('#register-form');
const statusMessage = document.querySelector('#status-message');
const submitButton = document.querySelector('#submit-btn');

await setupPage({ title: 'Регистрация' });

try {
  const existingUser = await requireGuest();

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
  const displayName = String(formData.get('displayName') || '').trim();
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '').trim();
  const confirmPassword = String(formData.get('confirmPassword') || '').trim();

  if (!displayName || !email || !password || !confirmPassword) {
    showInlineMessage(statusMessage, 'Всички полета са задължителни.', 'warning');
    return;
  }

  if (password.length < 6) {
    showInlineMessage(statusMessage, 'Паролата трябва да е поне 6 символа.', 'warning');
    return;
  }

  if (password !== confirmPassword) {
    showInlineMessage(statusMessage, 'Паролите не съвпадат.', 'warning');
    return;
  }

  submitButton?.setAttribute('disabled', 'disabled');

  try {
    await registerUser({ email, password, displayName });
    showInlineMessage(statusMessage, 'Регистрацията е успешна. Влез в профила си.', 'success');
    setTimeout(() => {
      window.location.href = './login.html';
    }, 900);
  } catch (error) {
    showInlineMessage(statusMessage, error.message, 'danger');
  } finally {
    submitButton?.removeAttribute('disabled');
  }
});
