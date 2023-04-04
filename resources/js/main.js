const translator = new Translator()

let webSocket = null
let subathonUserId = null
let streamlabsUserId = null
let streamelementsUserId = null
let streamlabs = null
let streamelements = null
let countDownDate = null
let timeLeft = 0
let countDownWorker = null
let running = false
let pause = false
let edit = false
let waiting = false
let maxTimeValue = 0
let limitReached = false
let currentLogFile = ''
let inputs = {
    subscriptionCounter: '',
    subscriptionSelect: '',
    bitsValue: '',
    bitsSelect: '',
    bitsCounter: '',
    donateValue: '',
    donateSelect: '',
    donateCounter: '',
    donateCurrency: ''
}
const currencies = {
    US: '$',
    BRL: 'R$',
    EUR: '€',
    JPY: '¥'
}

const configDiv = document.querySelector('#config')
const startButton = document.querySelector('#start-button')
const pauseButton = document.querySelector('#pause-button')
const subscriptionSelect = document.querySelector('#subscription-select')
const subscriptionCounter = document.querySelector('#subscription-counter')
const bitsValue = document.querySelector('#bits-value')
const bitsSelect = document.querySelector('#bits-select')
const bitsCounter = document.querySelector('#bits-counter')
const donateValue = document.querySelector('#donate-value')
const donateSelect = document.querySelector('#donate-select')
const donateCounter = document.querySelector('#donate-counter')
const hoursLabel = document.getElementById('hours')
const minutesLabel = document.getElementById('mins')
const secondsLabel = document.getElementById('secs')
const maxTime = document.querySelector('#max-time')
const maxTimeDiv = document.querySelector('#max-time-div')
const timeLimit = document.querySelector('#time-limit')
const dateLimit = document.querySelector('#date-limit')
const enableLimit = document.querySelector('#enable-limit')
const editButton = document.querySelector('#edit-button')
const infoSpan = document.querySelector('#info')
const donateCurrency = document.querySelector('#donate-currency')
const confirmModal = document.querySelector('#confirm-modal')
const updateModal = document.querySelector('#update-modal')

startButton.onclick = startCountDown
pauseButton.onclick = pauseCountDown
editButton.onclick = editConfig
timeLimit.oninput = updateTimeLeft
dateLimit.oninput = updateTimeLeft
maxTime.oninput = updateDeadEnd
enableLimit.onclick = showLimits

document.addEventListener('streamlabsConnected', (e) => initTimer(e))
document.addEventListener('streamlabsDisconnected', (e) => initTimer(e))
document.addEventListener('streamelementsConnected', (e) => initTimer(e))
document.addEventListener('streamelementsDisconnected', (e) => initTimer(e))
document.addEventListener('contextmenu', event => event.preventDefault())

async function startCountDown() {

    if (streamlabsUserId || streamelementsUserId) {

        if (startButton.value === await translator.loadOne("start")) {

            if (streamlabsUserId) {
                const socketToken = socket.value

                streamlabs = io(`https://sockets.streamlabs.com?token=${socketToken}`, { transports: ['websocket'] })

                streamlabs.on('connect', () => { streamlabsConnect() })
                streamlabs.on('disconnect', () => { streamlabsDisconnect() })
                streamlabs.on('event', (eventData) => { streamlabsEvent(eventData) })
            }

            // TODO: IMPLEMENTAR A INTEGRAÇÃO COM O STREAMELEMENTS
            if (streamelementsUserId) {
                const jwtToken = null

                streamelements = io('https://realtime.streamelements.com', { transports: ['websocket'] })

                streamelements.on('connect', () => { streamelementsConnect(streamelements, jwtToken) })
                streamelements.on('disconnect', () => { streamelementsDisconnect() })
                streamelements.on('authenticated', (data) => { streamelementsAuthenticated(data) })
                streamelements.on('unauthorized', (data) => { streamelementsUnauthorized(data) })
                streamelements.on('event:test', (data) => { streamelementsEvent(data) })
                streamelements.on('event', (data) => { streamelementsEvent(data) })
            }
        } else {
            await switchMode(false)
        }
    }
}

async function initTimer(e) {
    const event = e.type
    console.log(event)
    switch (event) {
        case 'streamlabsConnected':
            if (waiting) {
                await switchMode(true)
                waiting = false
            } else {
                if (streamelementsUserId) {
                    waiting = true
                } else {
                    await switchMode(true)
                    waiting = false
                }
            }
            break
        case 'streamelementsConnected':
            if (waiting) {
                await switchMode(true)
                waiting = false
            } else {
                if (streamlabsUserId) {
                    waiting = true
                } else {
                    await switchMode(true)
                    waiting = false
                }
            }
            break
    }
}

function updateWebTimer(type, countDownDate, isRunning) {
    const myHeaders = new Headers()
    myHeaders.append("Content-Type", "application/x-www-form-urlencoded")

    const urlencoded = new URLSearchParams()
    urlencoded.append("type", type)
    urlencoded.append("finalDate", countDownDate)
    urlencoded.append("running", isRunning)

    const requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: urlencoded,
        mode: 'no-cors'
    }

    fetch(NL_DOMAIN + streamlabsUserId, requestOptions)
        .then(response => response.text())
        .catch(error => console.log('error', error))
}

async function updateTimer() {
    const hours = Math.floor(timeLeft / (1000 * 60 * 60))
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000)

    hoursLabel.innerHTML = hours >= 10 ? hours : "0" + hours
    minutesLabel.innerHTML = minutes >= 10 ? minutes : "0" + minutes
    secondsLabel.innerHTML = seconds >= 10 ? seconds : "0" + seconds
    await Neutralino.filesystem.writeFile('./timer.txt', `${hoursLabel.innerHTML}:${minutesLabel.innerHTML}:${secondsLabel.innerHTML}`)
}

async function countDownFunction() {
    const now = new Date().getTime()
    timeLeft = countDownDate - now

    await updateTimer()

    if (timeLeft < 0) {
        await switchMode(false)
    }
}

async function switchMode(state) {
    if (state) {
        await saveData()
        currentLogFile = new Date().toLocaleString('pt-BR').replace(/\//g, '-').replace(/:/g, '_')

        countDownDate = new Date().getTime() + (timeLeft > 0 ? timeLeft + 1000 : 1000)
        maxTimeValue = new Date().getTime() + parseFloat(maxTime.value) * 60 * 60 * 1000

        countDownWorker = new Worker('js/worker.js')
        countDownWorker.onmessage = countDownFunction

        startButton.value = await translator.loadOne("stop")
        startButton.dataset.i18n = "stop"
        startButton.classList.add('connected')
        pauseButton.removeAttribute('hidden')
        editButton.removeAttribute('hidden')

        if (channelCheck.checked) {
            updateWebTimer('start', countDownDate, state)
        }

    } else {

        if (streamlabsUserId) {
            streamlabs.disconnect()
        }
        if (streamelementsUserId) {
            streamelements.disconnect()
        }
        startButton.value = await translator.loadOne("start")
        startButton.dataset.i18n = "start"
        startButton.classList.remove('connected')
        pauseButton.setAttribute('hidden', "true")
        editButton.setAttribute('hidden', "true")
        pauseButton.value = await translator.loadOne("pause")
        pauseButton.dataset.i18n = "pause"
        pauseButton.classList.remove('paused')
        pause = false
        limitReached = false
        timeLeft = 0
        await updateTimer()
        updateWebTimer('stop', 0, state)

        if (countDownWorker) {
            countDownWorker.terminate()
            countDownWorker = undefined
        }
        await Neutralino.filesystem.writeFile('./timer.txt', "00:00:00")
    }

    running = state
    switchInputs(state)
}

function switchInputs(state) {
    subscriptionSelect.disabled = state
    subscriptionCounter.disabled = state
    bitsValue.disabled = state
    bitsSelect.disabled = state
    bitsCounter.disabled = state
    donateValue.disabled = state
    donateSelect.disabled = state
    donateCounter.disabled = state
    maxTime.disabled = state
    enableLimit.disabled = state
    timeLimit.disabled = state
    dateLimit.disabled = state
}

async function pauseCountDown() {

    if (pause) {
        pause = false
        pauseButton.value = await translator.loadOne("pause")
        pauseButton.dataset.i18n = "pause"
        pauseButton.classList.remove('paused')
        countDownDate = new Date().getTime() + timeLeft
        countDownWorker = new Worker('js/worker.js')
        countDownWorker.onmessage = countDownFunction
        if (channelCheck.checked) {
            updateWebTimer('resume', countDownDate, pause)
        }
    } else {
        pause = true
        pauseButton.value = await translator.loadOne("resume")
        pauseButton.dataset.i18n = "resume"
        pauseButton.classList.add('paused')
        countDownWorker.terminate()
        countDownWorker = undefined
        if (channelCheck.checked) {
            updateWebTimer('pause', countDownDate, pause)
        }
    }
}

async function changeTimer(element) {
    const command = element.id.split('-')
    let value = null

    switch (command[2]) {
        case 'hours':
            value = 1000 * 60 * 60
            break
        case 'minutes':
            value = 1000 * 60
            break
        case 'seconds':
            value = 1000
            break
    }

    value = command[1] === 'unit' ? value : value * 10
    value = command[0] === 'add' ? value : value * (-1)

    if (value < 0 && Math.abs(value) > timeLeft) {
        return
    }

    if (pause || !running) {
        timeLeft += value
        await updateTimer()
        if (channelCheck.checked) {
            const now = new Date().getTime() + 1000
            updateWebTimer('update', now + timeLeft, running)
        }
    } else {
        countDownDate += value
        if (channelCheck.checked) {
            updateWebTimer('update', countDownDate, running)
        }
    }
}

function showLimits() {
    if (enableLimit.checked) {
        maxTimeDiv.removeAttribute('hidden')
        timeLimit.removeAttribute('hidden')
        dateLimit.removeAttribute('hidden')
    } else {
        maxTimeDiv.setAttribute('hidden', "true")
        timeLimit.setAttribute('hidden', "true")
        dateLimit.setAttribute('hidden', "true")
    }
}

function updateTimeLeft() {
    const now = new Date().getTime()
    const limit = new Date(`${dateLimit.value}T${timeLimit.value}`).getTime()
    let timeLeft = limit - now
    timeLeft = timeLeft / (1000 * 60 * 60)
    maxTime.value = timeLeft.toFixed(1)
}

function updateDeadEnd() {
    if (maxTime.value === '' || isNaN(parseFloat(maxTime.value))) {
        maxTime.value = ''
    } else {
        const now = new Date().getTime()
        const timeLeft = parseFloat(maxTime.value) * 60 * 60 * 1000
        const deadEnd = new Date(now + timeLeft)
        const hours = deadEnd.getHours() < 10 ? "0" + deadEnd.getHours() : deadEnd.getHours()
        const minutes = deadEnd.getMinutes() < 10 ? "0" + deadEnd.getMinutes() : deadEnd.getMinutes()
        const day = (deadEnd.getDate() < 10) ? "0" + deadEnd.getDate() : deadEnd.getDate()
        const month = (deadEnd.getMonth() + 1) < 10 ? "0" + (deadEnd.getMonth() + 1) : deadEnd.getMonth() + 1
        const year = deadEnd.getFullYear()

        timeLimit.value = `${hours}:${minutes}`
        dateLimit.value = `${year}-${month}-${day}`
    }
}

async function saveData() {
    inputs.subscriptionSelect = subscriptionSelect.value
    inputs.subscriptionCounter = subscriptionCounter.value
    inputs.bitsValue = bitsValue.value
    inputs.bitsSelect = bitsSelect.value
    inputs.bitsCounter = bitsCounter.value
    inputs.donateValue = donateValue.value
    inputs.donateSelect = donateSelect.value
    inputs.donateCounter = donateCounter.value
    inputs.donateCurrency = donateCurrency.value

    await Neutralino.storage.setData('subathonConfig',
        JSON.stringify({
            subscriptionSelect: subscriptionSelect.value,
            subscriptionCounter: subscriptionCounter.value,
            bitsValue: bitsValue.value,
            bitsSelect: bitsSelect.value,
            bitsCounter: bitsCounter.value,
            donateValue: donateValue.value,
            donateSelect: donateSelect.value,
            donateCounter: donateCounter.value,
            enableLimit: enableLimit.checked,
            timeLimit: timeLimit.value,
            dateLimit: dateLimit.value,
            donateCurrency: donateCurrency.value
        })
    )
}

async function saveLanguage(lang) {
    translator.load(lang)
    await Neutralino.storage.setData('language',
        JSON.stringify({
            language: translator.getCurrentLanguage()
        })
    )
}

async function editConfig() {
    if (running) {
        if (edit) {
            configDiv.style.border = '5px solid transparent'
            maxTimeValue = new Date().getTime() + parseFloat(maxTime.value) * 60 * 60 * 1000
            await saveData()
            switchInputs(true)
            edit = false
        } else {
            configDiv.style.border = '5px solid green'
            switchInputs(false)
            edit = true
        }
    }
}

async function getCurrency() {
    const data = await (await fetch('https://ipapi.co/json/')).json()
    return Object.keys(currencies).find(element => element === data.currency) ? data.currency : 'USD'
}

async function closeWindow() {
    updateWebTimer('stop', 0, false)
    await Neutralino.app.exit(0)
}

function changeModalVisibility(modal) {
    if (modal.style.visibility === 'hidden' || modal.style.visibility === '') {
        modal.style.visibility = 'visible'
        modal.style.opacity = '1'
    } else {
        modal.style.visibility = 'hidden'
        modal.style.opacity = '0'
    }
}

async function loadConfig() {

    try {
        const dataLanguage = JSON.parse(await Neutralino.storage.getData('language'))

        if (dataLanguage) {
            translator.load(dataLanguage.language)
        }
    } catch(e) {
        await saveLanguage('')
        console.log(e)
    }

    try {
        const subathonWebData = JSON.parse(await Neutralino.storage.getData('subathonWebData'))

        if (subathonWebData) {
            subathonUserId = subathonWebData.id
            streamlabsUserId = subathonWebData.streamlabsId
            streamelementsUserId = subathonWebData.streamelementsId
        }
    } catch (e) {
        console.log(e)
    }

    try {
        const data = JSON.parse(await Neutralino.storage.getData('subathonConfig'))

        if (data) {
            subscriptionSelect.value = data.subscriptionSelect
            subscriptionCounter.value = data.subscriptionCounter
            bitsValue.value = data.bitsValue
            bitsSelect.value = data.bitsSelect
            bitsCounter.value = data.bitsCounter
            donateValue.value = data.donateValue
            donateSelect.value = data.donateSelect
            donateCounter.value = data.donateCounter
            enableLimit.checked = data.enableLimit
            timeLimit.value = data.timeLimit
            dateLimit.value = data.dateLimit
            donateCurrency.value = data.donateCurrency

            updateTimeLeft()
            infoSpan.innerHTML = await translator.loadOne("load-success")
            setTimeout(() => {
                infoSpan.innerHTML = ""
            }, 3000)
        }
    }
    catch (e) {
        const now = new Date(new Date().getTime() + 3600000)
        const hours = now.getHours() < 10 ? "0" + now.getHours() : now.getHours()
        const minutes = now.getMinutes() < 10 ? "0" + now.getMinutes() : now.getMinutes()
        const day = (now.getDate() < 10) ? "0" + now.getDate() : now.getDate()
        const month = (now.getMonth() + 1) < 10 ? "0" + (now.getMonth() + 1) : now.getMonth() + 1
        const year = now.getFullYear()

        timeLimit.value = `${hours}:${minutes}`
        dateLimit.value = `${year}-${month}-${day}`
        updateTimeLeft()
        donateCurrency.value = await getCurrency()
        console.log(e)
    }

    showLimits()
}

async function onWindowClose() {
    if (running) {
        changeModalVisibility(confirmModal)
    } else {
        closeWindow()
    }
}

Neutralino.init()
Neutralino.events.on('windowClose', onWindowClose)

async function updateApp() {
    await Neutralino.updater.install()
    await Neutralino.app.restartProcess()
}

async function autoUpdate() {
    try {
        let url = `${NL_UPDATER_DOMAIN}/update_manifest.json`
        let manifest = await Neutralino.updater.checkForUpdates(url)

        if(manifest.version != NL_APPVERSION) {
            changeModalVisibility(updateModal)
        }
    }
    catch(err) {
        console.log("Erro ao atualizar a aplicação!")
        console.log(err)
    }
}

function openURL() {
    const state = CryptoJS.MD5((new Date().getTime()).toString()).toString().toUpperCase()
    const streamlabsConnectModal = document.querySelector('#streamlabs-connect-modal')
    webSocket = new WebSocket(`wss://subathon.davicoelho.com/?id=${state}`)

    webSocket.onopen = function () {
        changeModalVisibility(streamlabsConnectModal)
        ws.send('Conectado!')
    }
    webSocket.onmessage = async function (msg) {
        const data = JSON.parse(msg)

        if (data.authenticated) {
            const streamlabsConnectSpan = document.querySelector('[data-i18n=streamlabs-connect]')
            const loadingAnimation = document.querySelector('#loading-animation')

            streamlabsConnectSpan.innerHTML = await translator.loadOne("connect-success")
            loadingAnimation.style.display = 'none'
            setTimeout(changeModalVisibility(streamlabsConnectModal), 2000)
        }
    }
    const url = `https://streamlabs.com/api/v2.0/authorize?client_id=03bf0007-e939-4524-83a7-04935b158fb0&redirect_uri=https://subathon.davicoelho.com/auth&scope=socket.token&response_type=code&state=${state}`
    Neutralino.os.open(url)
}

loadConfig()
    .then(() => {
        autoUpdate()
    })