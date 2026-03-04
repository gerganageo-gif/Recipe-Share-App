import { getCurrentSession, loginUser, resendSignupConfirmation } from '../services/authService';
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
const SESSION_CHECK_ATTEMPTS = 5;
const SESSION_CHECK_DELAY_MS = 140;
let canProcessLoginSubmit = false;

function wait(delayMs) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, delayMs);
  });
}

async function hasPersistedSession() {
  try {
    const session = await getCurrentSession();
    return Boolean(session?.user);
  } catch {
    return false;
  }
}

async function waitForSessionPersistence() {
  for (let attempt = 1; attempt <= SESSION_CHECK_ATTEMPTS; attempt += 1) {
    const hasSession = await hasPersistedSession();

    if (hasSession) {
      return true;
    }

    if (attempt < SESSION_CHECK_ATTEMPTS) {
      await wait(SESSION_CHECK_DELAY_MS);
    }
  }

  return false;
}

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
  return message.includes('email not confirmed')
    || message.includes('не е потвърден')
    || message.includes('invalid login credentials')
    || message.includes('невалиден имейл или парола');
}

function sanitizeCredentialQueryParams() {
  const params = new URLSearchParams(window.location.search);
  const leakedEmail = String(params.get('email') || '').trim();
  const hasLeakedPassword = params.has('password');
  const hasCredentialParams = leakedEmail || hasLeakedPassword;

  if (!hasCredentialParams) {
    return;
  }

  if (leakedEmail && emailInput && !emailInput.value) {
    emailInput.value = leakedEmail;
  }

  params.delete('email');
  params.delete('password');

  const query = params.toString();
  const cleanUrl = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
  window.history.replaceState({}, '', cleanUrl);

  showInlineMessage(
    statusMessage,
    'Формата е изпратена преди страницата да е готова. Адресът е изчистен от чувствителни данни, натисни "Вход" отново.',
    'warning'
  );
}

sanitizeCredentialQueryParams();

const initializationPromise = initializeLoginPage();

async function initializeLoginPage() {
  submitButton?.setAttribute('disabled', 'disabled');

  try {
    await setupPage({ title: 'Вход' });

    try {
      const existingUser = await requireGuest(postLoginRedirectUrl);

      if (existingUser) {
        return false;
      }
    } catch (error) {
      showInlineMessage(statusMessage, error.message, 'danger');
    }

    canProcessLoginSubmit = true;
    return true;
  } catch (error) {
    showInlineMessage(statusMessage, error.message, 'danger');
    canProcessLoginSubmit = true;
    return true;
  } finally {
    submitButton?.removeAttribute('disabled');
  }
}

form?.addEventListener('submit', async (event) => {
  event.preventDefault();

  const ready = await initializationPromise;

  if (!ready || !canProcessLoginSubmit) {
    return;
  }

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

    const sessionReady = await waitForSessionPersistence();

    if (!sessionReady) {
      showInlineMessage(
        statusMessage,
        'Входът е успешен, но сесията не се запази. Разреши cookies/local storage и опитай отново.',
        'warning'
      );
      return;
    }

    showInlineMessage(statusMessage, 'Успешен вход. Пренасочване...', 'success');
    setTimeout(() => {
      window.location.replace(postLoginRedirectUrl);
    }, 320);
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
