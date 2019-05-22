// Функція, яка звертається до API для отримання інформації
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.type) {
    case 'api':
      fetch('https://api.conp.com.ua/api/v1.0/extension-organization?query=' + request.query)
        .then(response => response.json())
        .then(json => sendResponse(json))
      return true
      break
    case 'inject':
      fetch(browser.runtime.getURL('/background.html'))
        .then(response => response.text())
        .then(text => {
          text = text.replace('horizontal-logo.png', browser.runtime.getURL('horizontal-logo.png'))
          sendResponse(text)
        })
  }
  return true
})
