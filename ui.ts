const createButton = document.getElementById('create')
const cancelButton = document.getElementById('cancel')
const countInput = document.getElementById('count')

if (
  !(createButton instanceof HTMLButtonElement) ||
  !(cancelButton instanceof HTMLButtonElement) ||
  !(countInput instanceof HTMLInputElement)
) {
  throw new Error('The UI controls are unavailable.')
}

createButton.onclick = () => {
  const count = Number.parseInt(countInput.value, 10)

  parent.postMessage({ pluginMessage: { type: 'create-shapes', count } }, '*')
}

cancelButton.onclick = () => {
  parent.postMessage({ pluginMessage: { type: 'cancel' } }, '*')
}
