let streamlabs = null
let countDownDate = null
let timeLeft = null
let countDownRef = null
let pause = false

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
const initialTimeHour = document.querySelector('#initial-time-hour')
const initialTimeMinute = document.querySelector('#initial-time-minute')
const initialTimeSecond = document.querySelector('#initial-time-second')
const enableCounter = document.querySelector('#enable-counter')
const daysLabel = document.getElementById("days")
const hoursLabel = document.getElementById("hours")
const minutesLabel = document.getElementById("mins")
const secondsLabel = document.getElementById("secs")

startButton.onclick = startCountDown
pauseButton.onclick = pauseCountDown

async function startCountDown() {

    if (socket.value !== '') {

        if (startButton.value === 'Começar') {

            countDownDate = new Date().getTime()
                + parseFloat(initialTimeHour.value) * 60 * 60 * 1000
                + parseFloat(initialTimeMinute.value) * 60 * 1000
                + parseFloat(initialTimeSecond.value) * 1000
            countDownRef = setInterval(countDownFunction, 1000)
            const socketToken = socket.value
            await Neutralino.storage.setData('subathonConfig',
                JSON.stringify({
                    socketToken: socketToken,
                    subscriptionSelect: subscriptionSelect.value,
                    subscriptionCounter: subscriptionCounter.value,
                    bitsValue: bitsValue.value,
                    bitsSelect: bitsSelect.value,
                    bitsCounter: bitsCounter.value,
                    donateValue: donateValue.value,
                    donateSelect: donateSelect.value,
                    donateCounter: donateCounter.value,
                    initialTimeHour: initialTimeHour.value,
                    initialTimeMinute: initialTimeMinute.value,
                    initialTimeSecond: initialTimeSecond.value,
                    enableCounter: enableCounter.checked
                })
            )

            streamlabs = io(`https://sockets.streamlabs.com?token=${socketToken}`, { transports: ['websocket'] })

            streamlabs.on('connect', () => {
                startButton.value = 'Parar'
                startButton.classList.add('connected')
                pauseButton.removeAttribute('hidden')
                socket.disabled = true
                subscriptionSelect.disabled = true
                subscriptionCounter.disabled = true
                bitsValue.disabled = true
                bitsSelect.disabled = true
                bitsCounter.disabled = true
                donateValue.disabled = true
                donateSelect.disabled = true
                donateCounter.disabled = true
                initialTimeHour.disabled = true
                initialTimeMinute.disabled = true
                initialTimeSecond.disabled = true
            })

            streamlabs.on('disconnect', () => {
                startButton.value = 'Começar'
                startButton.classList.remove('connected')
                pauseButton.setAttribute('hidden', true)
                socket.disabled = false
                subscriptionSelect.disabled = false
                subscriptionCounter.disabled = false
                bitsValue.disabled = false
                bitsSelect.disabled = false
                bitsCounter.disabled = false
                donateValue.disabled = false
                donateSelect.disabled = false
                donateCounter.disabled = false
                initialTimeHour.disabled = true
                initialTimeMinute.disabled = true
                initialTimeSecond.disabled = true
            })

            streamlabs.on('event', (eventData) => {

                const event = eventData.message[0]
                console.log(eventData)

                if (eventData.for === 'streamlabs' && eventData.type === 'donation' && enableCounter.checked && !pause) {
                    if (event.amount >= parseFloat(donateValue.value)) {
                        const times = Math.floor(event.amount / parseFloat(donateValue.value))
                        switch (bitsSelect.value) {
                            case '1':
                                countDownDate += times * (parseFloat(donateCounter.value) * 1000)
                                break
                            case '2':
                                countDownDate += times * (parseFloat(donateCounter.value) * 1000 * 60)
                                break
                        }
                    }
                    console.log(`Muito obrigado pelo donate de ${event.formatted_amount}, ${event.name}!`)
                }
                if (eventData.for === 'twitch_account' && enableCounter.checked && !pause) {
                    switch (eventData.type) {
                        case 'subscription':
                            switch (subscriptionSelect.value) {
                                case '1':
                                    countDownDate += parseFloat(subscriptionCounter.value) * 1000
                                    break
                                case '2':
                                    countDownDate += parseFloat(subscriptionCounter.value) * 1000 * 60
                                    break
                            }
                            break
                        case 'resub':
                            switch (subscriptionSelect.value) {
                                case '1':
                                    countDownDate += parseFloat(subscriptionCounter.value) * 1000
                                    break
                                case '2':
                                    countDownDate += parseFloat(subscriptionCounter.value) * 1000 * 60
                                    break
                            }
                            break
                        case 'bits':
                            if (event.amount >= parseFloat(bitsValue.value)) {
                                const times = Math.floor(event.amount / parseFloat(bitsValue.value))
                                switch (bitsSelect.value) {
                                    case '1':
                                        countDownDate += times * (parseFloat(bitsCounter.value) * 1000)
                                        break
                                    case '2':
                                        countDownDate += times * (parseFloat(bitsCounter.value) * 1000 * 60)
                                        break
                                }
                            }
                            break
                    }
                }
            })
        }
        else {
            streamlabs.disconnect()
            startButton.value = 'Começar'
            startButton.classList.remove('connected')
            pauseButton.setAttribute('hidden', true)
            pauseButton.value = 'Pausar'
            pauseButton.classList.remove('paused')
            pause = false
            socket.disabled = false
            subscriptionSelect.disabled = false
            subscriptionCounter.disabled = false
            bitsValue.disabled = false
            bitsSelect.disabled = false
            bitsCounter.disabled = false
            donateValue.disabled = false
            donateSelect.disabled = false
            donateCounter.disabled = false
            initialTimeHour.disabled = true
            initialTimeMinute.disabled = true
            initialTimeSecond.disabled = true
            daysLabel.innerHTML = "00"
            hoursLabel.innerHTML = "00"
            minutesLabel.innerHTML = "00"
            secondsLabel.innerHTML = "00"
            clearInterval(countDownRef)
            await Neutralino.filesystem.writeFile('./timer.txt', "00:00:00:00")
        }
    }
}

function pauseCountDown() {
    if (pause) {
        pause = false
        pauseButton.value = 'Pausar'
        pauseButton.classList.remove('paused')
        countDownDate = new Date().getTime() + timeLeft
        countDownRef = setInterval(countDownFunction, 1000)
    }
    else {
        pause = true
        pauseButton.value = 'Resumir'
        pauseButton.classList.add('paused')
        clearInterval(countDownRef)
        countDownRef = null
    }
}

async function countDownFunction() {
    const now = new Date().getTime();
    timeLeft = countDownDate - now;

    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

    daysLabel.innerHTML = days >= 10 ? days : "0" + days
    hoursLabel.innerHTML = hours >= 10 ? hours : "0" + hours
    minutesLabel.innerHTML = minutes >= 10 ? minutes : "0" + minutes
    secondsLabel.innerHTML = seconds >= 10 ? seconds : "0" + seconds
    await Neutralino.filesystem.writeFile('./timer.txt', `${daysLabel.innerHTML}:${hoursLabel.innerHTML}:${minutesLabel.innerHTML}:${secondsLabel.innerHTML}`)

    if (timeLeft < 0) {
        clearInterval(countDownRef);
        startButton.value = 'Start'
        startButton.classList.remove('connected')
        daysLabel.innerHTML = "00"
        hoursLabel.innerHTML = "00"
        minutesLabel.innerHTML = "00"
        secondsLabel.innerHTML = "00"
        await Neutralino.filesystem.writeFile('./timer.txt', "00:00:00:00")
    }
}

function onWindowClose() {
    Neutralino.app.exit()
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
            initialTimeHour.value = data.initialTimeHour
            initialTimeMinute.value = data.initialTimeMinute
            initialTimeSecond.value = data.initialTimeSecond
            enableCounter.checked = data.enableCounter
        }
    }
    catch (e) {
        console.log(e)
    }
}

Neutralino.init()
loadConfig()

Neutralino.events.on('windowClose', onWindowClose)
