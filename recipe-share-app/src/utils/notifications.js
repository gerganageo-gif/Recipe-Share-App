const TYPE_ICON = {
  success: 'bi-check-circle',
  danger: 'bi-exclamation-octagon',
  warning: 'bi-exclamation-triangle',
  info: 'bi-info-circle',
  secondary: 'bi-chat-left-text'
};

export function showInlineMessage(container, message, type = 'info') {
  if (!container) {
    return;
  }

  const iconClass = TYPE_ICON[type] || TYPE_ICON.info;

  container.innerHTML = `
    <div class="alert alert-${type} d-flex align-items-center gap-2" role="alert">
      <i class="bi ${iconClass}"></i>
      <span>${message}</span>
    </div>
  `;
}

export function clearInlineMessage(container) {
  if (!container) {
    return;
  }

  container.innerHTML = '';
}
