import { loginUser, resendSignupConfirmation } from '../services/authService';
import { requireGuest } from '../utils/guards';
import { getPostLoginRedirectUrl } from '../utils/authRedirect';
import { clearInlineMessage, showInlineMessage } from '../utils/notifications';
import { setupPage } from './shared';

const form = document.querySelector('#login-form');
const statusMessage = document.querySelector('#status-message');
const submitButton = document.querySelector('#submit-btn');
const emailInput = document.querySelector('#email');
const resendConfirmationWrap = document.querySelector('#resend-confirmation-wrap');
const resendConfirmationButton = document.querySelector('#resend-confirmation-btn');
const postLoginRedirectUrl = getPostLoginRedirectUrl();

function toggleResendConfirmationAction(visible) {
  if (!resendConfirmationWrap) {
    return;
  }

  if (visible) {
    resendConfirmationWrap.classList.remove('d-none');
    return;
  }

  resendConfirmationWrap.classList.add('d-none');
}

function shouldShowResendConfirmation(error) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('email not confirmed') || message.includes('не е потвърден');
}

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
  toggleResendConfirmationAction(false);

  const formData = new FormData(form);
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');

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

    if (shouldShowResendConfirmation(error)) {
      toggleResendConfirmationAction(true);
    }
  } finally {
    submitButton?.removeAttribute('disabled');
  }
});

resendConfirmationButton?.addEventListener('click', async () => {
  clearInlineMessage(statusMessage);

  const email = String(emailInput?.value || '').trim();

  if (!email) {
    showInlineMessage(statusMessage, 'Въведи имейл, за да изпратим писмото за потвърждение.', 'warning');
    return;
  }

  resendConfirmationButton.setAttribute('disabled', 'disabled');

  try {
    await resendSignupConfirmation(email);
    showInlineMessage(statusMessage, 'Изпратихме ново писмо за потвърждение. Провери входящата си поща.', 'info');
  } catch (error) {
    showInlineMessage(statusMessage, error.message, 'danger');
  } finally {
    resendConfirmationButton.removeAttribute('disabled');
  }
});
