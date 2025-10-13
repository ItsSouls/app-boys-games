// Utilidades DOM para manipular elementos
export function hideAllSections() {
  const sections = [
    '.welcome-section',
    '#main-menu',
    '#videos-section',
    '#vocabulary-section',
  '#game-container',
  '#vocab-theory-section',
  '#grammar-section'
  ];
  
  sections.forEach(selector => {
    const element = document.querySelector(selector);
    if (element) {
      element.classList.add('hidden');
    }
  });
}

export function showElement(selector) {
  const element = document.querySelector(selector);
  if (element) {
    element.classList.remove('hidden');
  }
}

export function hideElement(selector) {
  const element = document.querySelector(selector);
  if (element) {
    element.classList.add('hidden');
  }
}

export function createElement(tag, className, content) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (content) element.innerHTML = content;
  return element;
}

export function updateElementText(selector, text) {
  const element = document.querySelector(selector);
  if (element) {
    element.textContent = text;
  }
}
