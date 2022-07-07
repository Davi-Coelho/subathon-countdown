let streamlabs = null
let countDownDate = null
let timeLeft = 0
let countDownRef = null
let running = false
let pause = false
let maxTimeValue = 0
let currentLogFile = ''

const streamLabsDiv = document.querySelector('#streamlabs')
const controlsDiv = document.querySelector('#controls')
const configDiv = document.querySelector('#config')
const socket = document.querySelector('#socket')
const startButton = document.querySelector('#start-button')
const pauseButton = document.querySelector('#pause-button')
const timer = document.querySelector('#timer')
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
const timeLimit = document.querySelector('#time-limit')
const dateLimit = document.querySelector('#date-limit')
const enableLimit = document.querySelector('#enable-limit')
const hideButton = document.querySelector('#hide-button')

startButton.onclick = startCountDown
pauseButton.onclick = pauseCountDown
hideButton.onclick = hideShowWindow
timeLimit.oninput = updateTimeLeft
dateLimit.oninput = updateTimeLeft
maxTime.oninput = updateDeadEnd

async function startCountDown() {

    if (socket.value !== '') {

        if (startButton.value === 'Começar') {

            currentLogFile = new Date().toLocaleString('pt-BR').replace(/\//g, '-').replace(/:/g, '_')
            await Neutralino.filesystem.writeFile(`./resumo ${currentLogFile}.txt`, "")

            countDownDate = new Date().getTime() + (timeLeft > 0 ? timeLeft : 1000)
            maxTimeValue = new Date().getTime() + parseFloat(maxTime.value) * 60 * 60 * 1000

            countDownRef = new Worker('js/worker.js')
            countDownRef.onmessage = countDownFunction
            const socketToken = socket.value
            saveData()

            streamlabs = io(`https://sockets.streamlabs.com?token=${socketToken}`, { transports: ['websocket'] })

            streamlabs.on('connect', () => {
                switchMode(true)
            })

            streamlabs.on('disconnect', () => {
                switchMode(false)
            })

            streamlabs.on('event', async (eventData) => {

                const event = eventData.message[0]

                if (!eventData.for && eventData.type === 'donation' && enableCounter.checked && !pause) {
                    let amount = 0

                    console.log(event.currency)
                    if (event.currency !== 'BRL') {
                        console.log('Convertendo...')
                        await fetch(`https://api.exchangerate.host/latest?base=${event.currency}&amount=${event.amount}&symbols=BRL`)
                            .then(response => response.text())
                            .then(data => amount = (JSON.parse(data)).rates.BRL)
                    }
                    else {
                        amount = event.amount
                    }

                    const times = amount / parseFloat(donateValue.value)
                    await Neutralino.filesystem.appendFile(`./resumo ${currentLogFile}.txt`, `${event.from} doou R$${amount}\n`)
                    switch (donateSelect.value) {
                        case '1':
                            if (!enableLimit.checked || (countDownDate + times * (parseFloat(donateCounter.value) * 1000)) <= maxTimeValue) {
                                countDownDate += times * (parseFloat(donateCounter.value) * 1000)
                            }
                            else {
                                countDownDate = maxTimeValue
                            }
                            break
                        case '2':
                            if (!enableLimit.checked || (countDownDate + times * (parseFloat(donateCounter.value) * 1000 * 60)) <= maxTimeValue) {
                                countDownDate += times * (parseFloat(donateCounter.value) * 1000 * 60)
                            }
                            else {
                                countDownDate = maxTimeValue
                            }
                            break
                    }
                    console.log(`Muito obrigado pelo donate de ${event.formatted_amount}, ${event.name}!`)
                }
                if (eventData.for === 'twitch_account' && enableCounter.checked && !pause) {
                    switch (eventData.type) {
                        case 'subscription':
                            await Neutralino.filesystem.appendFile(`./resumo ${currentLogFile}.txt`, `${event.name} se inscreveu.\n`)
                            switch (subscriptionSelect.value) {
                                case '1':
                                    if (!enableLimit.checked || (countDownDate + parseFloat(subscriptionCounter.value) * 1000) <= maxTimeValue) {
                                        countDownDate += parseFloat(subscriptionCounter.value) * 1000
                                    }
                                    else {
                                        countDownDate = maxTimeValue
                                    }
                                    break
                                case '2':
                                    if (!enableLimit.checked || (countDownDate + parseFloat(subscriptionCounter.value) * 1000 * 60) <= maxTimeValue) {
                                        countDownDate += parseFloat(subscriptionCounter.value) * 1000 * 60
                                    }
                                    else {
                                        countDownDate = maxTimeValue
                                    }
                                    break
                            }
                            break
                        case 'resub':
                            await Neutralino.filesystem.appendFile(`./resumo ${currentLogFile}.txt`, `${event.name} se inscreveu.\n`)
                            switch (subscriptionSelect.value) {
                                case '1':
                                    if (!enableLimit.checked || (countDownDate + parseFloat(subscriptionCounter.value) * 1000) <= maxTimeValue) {
                                        countDownDate += parseFloat(subscriptionCounter.value) * 1000
                                    }
                                    else {
                                        countDownDate = maxTimeValue
                                    }
                                    break
                                case '2':
                                    if (!enableLimit.checked || (countDownDate + parseFloat(subscriptionCounter.value) * 1000 * 60) <= maxTimeValue) {
                                        countDownDate += parseFloat(subscriptionCounter.value) * 1000 * 60
                                    }
                                    else {
                                        countDownDate = maxTimeValue
                                    }
                                    break
                            }
                            break
                        case 'bits':
                            await Neutralino.filesystem.appendFile(`./resumo ${currentLogFile}.txt`, `${event.name} doou ${event.amount} bits.\n`)
                            const times = event.amount / parseFloat(bitsValue.value)
                            switch (bitsSelect.value) {
                                case '1':
                                    if (!enableLimit.checked || (countDownDate + times * (parseFloat(bitsCounter.value) * 1000)) <= maxTimeValue) {
                                        countDownDate += times * (parseFloat(bitsCounter.value) * 1000)
                                    }
                                    else {
                                        countDownDate = maxTimeValue
                                    }
                                    break
                                case '2':
                                    if (!enableLimit.checked || (countDownDate + times * (parseFloat(bitsCounter.value) * 1000) * 60) <= maxTimeValue) {
                                        countDownDate += times * (parseFloat(bitsCounter.value) * 1000 * 60)
                                    }
                                    else {
                                        countDownDate = maxTimeValue
                                    }
                                    break
                            }
                            console.log(`Muito obrigado pelos ${event.amount}, ${event.name}!`)
                            break
                    }
                }
            })
        }
        else {
            streamlabs.disconnect()
            pauseButton.value = 'Pausar'
            pauseButton.classList.remove('paused')
            pause = false
            switchMode(false)
            timeLeft = 0
            updateTimer()
            countDownRef.terminate()
            countDownRef = undefined
            await Neutralino.filesystem.writeFile('./timer.txt', "00:00:00")
        }
    }
}

async function updateTimer() {
    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

    hoursLabel.innerHTML = hours >= 10 ? hours : "0" + hours
    minutesLabel.innerHTML = minutes >= 10 ? minutes : "0" + minutes
    secondsLabel.innerHTML = seconds >= 10 ? seconds : "0" + seconds
    await Neutralino.filesystem.writeFile('./timer.txt', `${hoursLabel.innerHTML}:${minutesLabel.innerHTML}:${secondsLabel.innerHTML}`)
}

async function countDownFunction() {
    const now = new Date().getTime();
    timeLeft = countDownDate - now;

    updateTimer()

    if (timeLeft < 0) {
        streamlabs.disconnect()
        pauseButton.value = 'Pausar'
        pauseButton.classList.remove('paused')
        pause = false
        switchMode(false)
        timeLeft = 0
        updateTimer()
        countDownRef.terminate()
        countDownRef = undefined
        await Neutralino.filesystem.writeFile('./timer.txt', "00:00:00")
    }
}

function switchMode(mode) {
    if (mode) {
        startButton.value = 'Parar'
        startButton.classList.add('connected')
        pauseButton.removeAttribute('hidden')

    } else {
        startButton.value = 'Começar'
        startButton.classList.remove('connected')
        pauseButton.setAttribute('hidden', true)
    }

    running = mode
    socket.disabled = mode
    subscriptionSelect.disabled = mode
    subscriptionCounter.disabled = mode
    bitsValue.disabled = mode
    bitsSelect.disabled = mode
    bitsCounter.disabled = mode
    donateValue.disabled = mode
    donateSelect.disabled = mode
    donateCounter.disabled = mode
    maxTime.disabled = mode
    enableLimit.disabled = mode
}

function pauseCountDown() {
    if (pause) {
        pause = false
        pauseButton.value = 'Pausar'
        pauseButton.classList.remove('paused')
        countDownDate = new Date().getTime() + timeLeft
        countDownRef = new Worker('js/worker.js')
        countDownRef.onmessage = countDownFunction
    }
    else {
        pause = true
        pauseButton.value = 'Resumir'
        pauseButton.classList.add('paused')
        countDownRef.terminate()
        countDownRef = undefined
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
        updateTimer()
    }
    else {
        countDownDate += value
    }
}

async function hideShowWindow() {

    const size = await Neutralino.window.getSize()
    const arrow = document.querySelector('.arrow')

    if (size.height === 600) {
        await Neutralino.window.setSize({ width: size.width, height: 200 })
        streamLabsDiv.style.display = 'none'
        configDiv.style.display = 'none'
        controlsDiv.style.display = 'none'
        arrow.classList.remove('up')
        arrow.classList.add('down')
    }
    else {
        await Neutralino.window.setSize({ width: size.width, height: 600 })
        streamLabsDiv.style.display = 'block'
        configDiv.style.display = 'flex'
        controlsDiv.style.display = 'block'
        arrow.classList.remove('down')
        arrow.classList.add('up')
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
    }
    else {
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
    await Neutralino.storage.setData('subathonConfig',
        JSON.stringify({
            socketToken: socket.value,
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
            dateLimit: dateLimit.value
        })
    )
}

async function loadConfig() {
    try {
        const data = JSON.parse(await Neutralino.storage.getData('subathonConfig'))

        if (data) {
            socket.value = data.socketToken
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

            updateTimeLeft()
        }
    }
    catch (e) {
        console.log(e)
    }
}

function onWindowClose() {
    Neutralino.app.exit()
}

Neutralino.init()
Neutralino.events.on('windowClose', onWindowClose)
loadConfig()