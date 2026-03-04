import { getCurrentUser } from '../services/authService';
import { getMyProfile, updateMyProfile } from '../services/profileService';
import { requireAuth } from '../utils/guards';
import { clearInlineMessage, showInlineMessage } from '../utils/notifications';
import { setupPage } from './shared';

const form = document.querySelector('#profile-form');
const statusMessage = document.querySelector('#status-message');
const submitButton = document.querySelector('#submit-btn');
const avatarPreview = document.querySelector('#avatar-preview');
const profileName = document.querySelector('#profile-name');
const profileEmail = document.querySelector('#profile-email');
const avatarUrlInput = document.querySelector('#avatarUrl');

await setupPage({ title: 'Моят профил' });

let currentUser = null;

try {
  currentUser = await requireAuth();

  if (!currentUser) {
    return;
  }

  await loadProfile();
} catch (error) {
  showInlineMessage(statusMessage, error.message, 'danger');
}

function updateAvatarPreview(url, name = 'Avatar') {
  if (!avatarPreview) {
    return;
  }

  if (!url) {
    avatarPreview.src = `https://placehold.co/280x280?text=${encodeURIComponent(name)}`;
    return;
  }

  avatarPreview.src = url;
}

async function loadProfile() {
  if (!form || !currentUser) {
    return;
  }

  const profile = await getMyProfile();
  const displayName = profile?.display_name || currentUser.user_metadata?.display_name || 'Потребител';
  const email = profile?.email || currentUser.email || '';
  const avatarUrl = profile?.avatar_url || '';
  const bio = profile?.bio || '';

  const displayNameInput = form.querySelector('#displayName');
  const emailInput = form.querySelector('#email');
  const bioInput = form.querySelector('#bio');

  if (displayNameInput) {
    displayNameInput.value = displayName;
  }

  if (emailInput) {
    emailInput.value = email;
  }

  if (avatarUrlInput) {
    avatarUrlInput.value = avatarUrl;
  }

  if (bioInput) {
    bioInput.value = bio;
  }

  if (profileName) {
    profileName.textContent = displayName;
  }

  if (profileEmail) {
    profileEmail.textContent = email;
  }

  updateAvatarPreview(avatarUrl, displayName);
}

avatarUrlInput?.addEventListener('input', () => {
  const displayNameInput = form?.querySelector('#displayName');
  const name = displayNameInput?.value || 'Avatar';
  updateAvatarPreview(avatarUrlInput.value.trim(), name);
});

form?.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!currentUser) {
    return;
  }

  clearInlineMessage(statusMessage);

  const formData = new FormData(form);
  const displayName = String(formData.get('displayName') || '').trim();
  const avatarUrl = String(formData.get('avatarUrl') || '').trim();
  const bio = String(formData.get('bio') || '').trim();

  if (!displayName) {
    showInlineMessage(statusMessage, 'Името е задължително.', 'warning');
    return;
  }

  submitButton?.setAttribute('disabled', 'disabled');

  try {
    const updatedProfile = await updateMyProfile({
      display_name: displayName,
      avatar_url: avatarUrl || null,
      bio: bio || null
    });

    if (profileName) {
      profileName.textContent = updatedProfile.display_name;
    }

    updateAvatarPreview(updatedProfile.avatar_url, updatedProfile.display_name);
    showInlineMessage(statusMessage, 'Профилът е обновен успешно.', 'success');

    await getCurrentUser().catch(() => null);
  } catch (error) {
    showInlineMessage(statusMessage, error.message, 'danger');
  } finally {
    submitButton?.removeAttribute('disabled');
  }
});
