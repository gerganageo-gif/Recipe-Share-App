const HTML_ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

export function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (character) => HTML_ENTITIES[character]);
}

export function multilineToHtml(value = '') {
  return escapeHtml(value).replace(/\n/g, '<br>');
}
