// Глобальні змінні
let targetClass = 'klh-organization'

// Фіксуємо паттерни для пошуку інформації
let uk = `[а-яєіїєґ]`
let edrpou = `(?:ЄДРПОУ.*?\\D)(\\d{8})(?:^|\\D)`
let goPattern = `(?:В?М?ГО|громадськ.{1,8}організац${uk}+)`
let tovPattern = `(?:Тз?ОВ|товариств.{1,8}обмежен.{1,6}відповідальн${uk}+)`
let tdvPattern = `(?:Тз?ДВ|товариств.{1,8}додатков.{1,6}відповідальн${uk}+)`
let auctionPattern = `(?:[ВЗП]?р?АТ|((публічн|відкрит|закрит|приватн).{1,8})?акціонерн.{1,6}товариств${uk}+)`
let statePattern = `(?:[ДКП]П|((державн|комунальн|приватн).{1,8})?підприємств${uk}+)`
let quotesPattern = `(".*?${uk}"|“.*?${uk}[”“]|”.*?${uk}[”“]|«.*?${uk}»|[«”“].*? ${uk} [”“»] )`
let organizationPattern = `(?:^|[^а-яєіїґъёы])(${goPattern}|${tovPattern}|${tdvPattern}|${auctionPattern}|${statePattern}) +${quotesPattern}`
let finalPattern = new RegExp(organizationPattern, 'gi')
let finalPattern2 = new RegExp('(?:^|[^А-ЯЄІЇҐЁЫЪ])(В?М?ГО|ТЗ?[ОД]В|[ЗВП]?АТ|[ДКП]П) +[А-ЯЄІЇҐЁЫЪ, -]{10,}', 'g')
let edrpouPattern = new RegExp(edrpou, 'g')

// Створюємо функцію пошуку паттернів та заміни їх на нові дані
let contentLength = 0

function replaceElements () {
  // Перевіряємо, чи змінився зміст після запиту
  let currentLength = document.getElementsByTagName('html')[0].textContent.length

  // Якщо зміни незначні, то не змінюємо контент
  if (contentLength && Math.abs(currentLength - contentLength) < 200) return false
  contentLength = currentLength

  // Отримуємо усі елементи на сторінці
  let elements = Array.from(document.getElementsByTagName('*'))

  // Фільтруємо елементи, які вже були замінені
  elements = elements.filter(el => el.classList.value.match(targetClass) === null)
  elements = elements.filter(el => !['A', 'META', 'HEAD', 'LINK', 'NAV', 'SCRIPT', 'NOSCRIPT', 'STYLE', 'EM', 'BODY', 'HEAD', 'HTML'].includes(el.tagName))

  // Фільтруємо елементи, в яких є вміст
  let nodes = elements.reduce((arr, el) => { return arr.concat(Array.from(el.childNodes)) }, [])

  // Фільтруємо елементи, які не варто змінювати
  nodes = nodes
    .filter(el => !['A', 'META', 'HEAD', 'LINK', 'NAV', 'SCRIPT', 'NOSCRIPT', 'STYLE', 'EM', 'BODY', 'HEAD', 'HTML'].includes(el.tagName))
    .filter(el => typeof el.innerHTML !== 'undefined')
    .filter(el => el.innerHTML.match(/<(a|div|span|table|tbody|td|tr|th|ul|li|link|nav|cite)/) === null)
    .filter(el => typeof el.className !== 'string' || el.className.match(/klh-info|klh-ignore|klh-organization/) === null)

  // Залишаємо лише ті елемени, які безпосередньо містять текст
  let targetNodes = nodes.filter(el => {
    if (el.nodeType !== 1) return false
    return Array.from(el.childNodes).filter(el => el.nodeValue === null || el.nodeValue.length > 2)
  })

  // Замінюємо текст на текст з інтерактивним елементом
  for (let node of targetNodes) {
    let text = node.textContent
    if (text.match(targetClass)) continue
    if (!text.match(finalPattern) && !text.match(finalPattern2) && !text.match(edrpouPattern)) continue
    let newText = text.replace(finalPattern, s => {
      let cleanPart = s.replace(/^[^а-яєії]|[^а-яєії"”“»]$/gi, '')
      s = s.replace(cleanPart, el => `<span class="${targetClass}">${el}</span>`)
      return s
    })
    newText = newText.replace(finalPattern2, s => {
      let cleanPart = s.replace(/^[^а-яєії]+|[^а-яєії"”“»]+$/gi, '')
      s = s.replace(cleanPart, el => `<span class="${targetClass}">${el}</span>`)
      return s
    })
    newText = newText.replace(edrpouPattern, s => {
      let edrpouCode = s.match(/(?:^|\D)(\d{8})(?:$|\D)/)[1]
      if (!checkEDR(edrpouCode)) return s
      s = s.replace(edrpouCode, el => `<span class="${targetClass}">${el}</span>`)
      return s
    })
    node.innerHTML = newText
  }

  // До кожного елемента додаємо інтерактивну функцію
  let nodesWithTargetClass = Array.from(document.getElementsByClassName('klh-organization'))
  nodesWithTargetClass.forEach(el => el.removeEventListener('click', interaction))
  nodesWithTargetClass.forEach(el => el.addEventListener('click', interaction))
}

// Створюємо власний стиль для елемента
const sheet = document.createElement('style')
sheet.innerHTML = `.klh-organization { font-weight: bold; color: #F1765E; cursor: pointer; }`
document.body.appendChild(sheet)

browser.runtime.sendMessage({ type: 'inject' }, response => {
  let elements = response
  let div = document.createElement('div')
  div.innerHTML = elements.trim()
  document.body.insertBefore(div, document.body.lastChild.nextSibling)
})

// Функція, що відповідає за інтерактивний функціонал
const interaction = function (evt) {
  browser.runtime.sendMessage({ type: 'api', query: evt.target.textContent }, response => {
    if (!response.organization) return alert('Організація не знайдена')

    setInnerContent('klh-name', response.organization.name)
    setInnerContent('klh-legalName', response.organization.legalName)
    setInnerContent('klh-identifier', response.organization.identifier.id)
    setInnerContent('klh-currentStatus', response.organization.currentStatus)
    setInnerContent('klh-full_kved', response.organization.full_kved)
    if (response.organization.amountOfFunds) {
      setInnerContent('klh-amountOfFunds', response.organization.amountOfFunds + ' грн.')
    } else {
      setInnerContent('klh-amountOfFunds', '')      
    }
    if (response.organization.head) setInnerContent('klh-head', response.organization.head.fullName)
    if (response.organization.founders) {
      let founders = response.organization.founders.map(el => `<li>${el.source}</li>`).join('')
      setInnerContent('klh-founderlist', founders)
    }
    if (response.organization.address) {
      setInnerContent('klh-address', response.organization.address.fullAddress)
      document.getElementById('klh-address').setAttribute('href','http://maps.google.com/?q=' + response.organization.address.fullAddress)
    }
    if (response.lawsuits) {
      let lawsuits = response.lawsuits.map(el => {
        let date = el.lawsuitDate.split('T')[0]
        return `
          <li>
            <strong style="font-size: 0.8em">${date}</strong><br/>
            <a target="_blank" href="https://conp.com.ua/lawsuit/${el.id}">${el.causeForm} по справі ${el.lawsuitNumber}</a><br/>
            <span style="color: #777;">${el.causeKind}</span>
          </li>
        `
      }).join('')
      setInnerContent('klh-lawsuitlist', lawsuits)
    }
    document.getElementById('klh-close').checked = false
  })
}

function setInnerContent (elementId, text = '') {
  let element = document.getElementById(elementId)
  if (!element) return false
  if (!text) text = 'Не визначено'
  element.innerHTML = text
}

// Функція, що перевіряє код ЄДРПОУ
function checkEDR (edrpouval) {
  // Check EDR number
  let edrpouNum = parseInt(edrpouval)
  let numbers = edrpouval.split('').map(x => parseInt(x))
  let coefficients = [1, 2, 3, 4, 5, 6, 7]
  if (edrpouNum > 30000000 && edrpouNum < 60000000) coefficients = [7, 1, 2, 3, 4, 5, 6]
  let sum = 0
  for (let i = 0; i < numbers.length - 1; i++) { sum += numbers[i] * coefficients[i] }
  let result = sum % 11
  if (result === 10) {
    coefficients = [3, 4, 5, 6, 7, 8, 9]
    if (edrpouNum > 30000000 && edrpouNum < 60000000) coefficients = [9, 3, 4, 5, 6, 7, 8]
    sum = 0
    for (let i = 0; i < numbers.length - 1; i++) { sum += numbers[i] * coefficients[i] }
    result = sum%11
    if (result === 10) result = 0
  }
  return numbers[7] === result
}

replaceElements()

let timeInterval
const observer = new MutationObserver(mutations => {
  clearTimeout(timeInterval)
  timeInterval = setTimeout(replaceElements, 700)
})

observer.observe(document.body, { childList: true, subtree: true })
