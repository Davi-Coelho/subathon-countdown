const translator = new Translator()

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

const channelCheck = document.querySelector('#ws-check')
const channel = document.querySelector('#channel')
const socketCheck = document.querySelector('#socket-check')
const jwtCheck = document.querySelector('#jwt-check')
const configDiv = document.querySelector('#config')
const socket = document.querySelector('#socket')
const jwt = document.querySelector('#jwt')
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
const enableCounter = document.querySelector('#enable-counter')
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

    if ((!socketCheck.checked || socket.value !== '') &&
        (socketCheck.checked || jwtCheck.checked) &&
        (!jwtCheck.checked || jwt.value !== '')) {

        if (startButton.value === await translator.loadOne("start")) {

            if (socketCheck.checked) {
                const socketToken = socket.value

                streamlabs = io(`https://sockets.streamlabs.com?token=${socketToken}`, { transports: ['websocket'] })

                streamlabs.on('connect', () => { streamlabsConnect() })
                streamlabs.on('disconnect', () => { streamlabsDisconnect() })
                streamlabs.on('event', (eventData) => { streamlabsEvent(eventData) })
            }

            if (jwtCheck.checked) {
                const jwtToken = jwt.value

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
                if (jwtCheck.checked) {
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
                if (socketCheck.checked) {
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

    fetch(NL_DOMAIN + channel.value, requestOptions)
        .then(response => response.text())
        .then(result => console.log(result))
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

        if (socketCheck.checked) {
            streamlabs.disconnect()
        }
        if (jwtCheck.checked) {
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
        if (channelCheck.checked) {
            updateWebTimer('stop', 0, state)
        }

        if (countDownWorker) {
            countDownWorker.terminate()
            countDownWorker = undefined
        }
        await Neutralino.filesystem.writeFile('./timer.txt', "00:00:00")
    }

    running = state
    channel.disabled = state
    socket.disabled = state
    jwt.disabled = state
    channelCheck.disabled = state
    socketCheck.disabled = state
    jwtCheck.disabled = state
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
            channelCheck: channelCheck.checked,
            channel: channel.value,
            socketCheck: socketCheck.checked,
            jwtCheck: jwtCheck.checked,
            socketToken: socket.value,
            jwt: jwt.value,
            subscriptionSelect: subscriptionSelect.value,
            subscriptionCounter: subscriptionCounter.value,
            bitsValue: bitsValue.value,
            bitsSelect: bitsSelect.value,
            bitsCounter: bitsCounter.value,
            donateValue: donateValue.value,
            donateSelect: donateSelect.value,
            donateCounter: donateCounter.value,
            enableCounter: enableCounter.checked,
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

function changeModalVisibility() {
    if (confirmModal.style.visibility === 'hidden' || confirmModal.style.visibility === '') {
        confirmModal.style.visibility = 'visible'
        confirmModal.style.opacity = '1'
    } else {
        confirmModal.style.visibility = 'hidden'
        confirmModal.style.opacity = '0'
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
        const data = JSON.parse(await Neutralino.storage.getData('subathonConfig'))

        if (data) {
            channelCheck.checked = data.channelCheck
            channel.value = data.channel
            socketCheck.checked = data.socketCheck
            jwtCheck.checked = data.jwtCheck
            socket.value = data.socketToken
            jwt.value = data.jwt
            subscriptionSelect.value = data.subscriptionSelect
            subscriptionCounter.value = data.subscriptionCounter
            bitsValue.value = data.bitsValue
            bitsSelect.value = data.bitsSelect
            bitsCounter.value = data.bitsCounter
            donateValue.value = data.donateValue
            donateSelect.value = data.donateSelect
            donateCounter.value = data.donateCounter
            enableCounter.checked = data.enableCounter
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
        changeModalVisibility()
    } else {
        closeWindow()
    }
}

Neutralino.init()
Neutralino.events.on('windowClose', onWindowClose)

async function autoUpdate() {
    try {
        let url = `${NL_UPDATER_DOMAIN}/update_manifest.json`
        let manifest = await Neutralino.updater.checkForUpdates(url)

        if(manifest.version != NL_APPVERSION) {
            await Neutralino.updater.install()
            await Neutralino.app.restartProcess()
        }
    }
    catch(err) {
        console.log("Erro ao atualizar a aplicação!")
        console.log(err)
    }
}

loadConfig()
    .then(() => {
        autoUpdate()
    })