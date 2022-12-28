function streamelementsConnect(streamelements, jwtToken) {
    streamelements.emit('authenticate', { method: 'jwt', token: jwtToken })
}

function streamelementsDisconnect() {
    document.dispatchEvent(new Event('streamelementsDisconnected'))
}

function streamelementsAuthenticated(data) {
    document.dispatchEvent(new Event('streamelementsConnected'))
}

function streamelementsUnauthorized(data) {
    console.log(`Authentication failed - ${JSON.stringify(data)}`)
}

async function streamelementsEvent(eventData) {
    let listener = eventData.type
    let event = eventData.data
    let times = 0
    let mult = 0
    console.log(eventData)

    if (enableCounter.checked && (!socketCheck.checked || !jwtCheck.checked || listener === 'tip') && !limitReached) {
        switch (listener) {
            case 'tip':
                let amount = 0

                if (event.currency !== 'BRL') {
                    console.log('Convertendo...')
                    await fetch(`https://api.exchangerate.host/latest?base=${event.currency}&amount=${event.amount}&symbols=BRL`)
                        .then(response => response.text())
                        .then(data => amount = (JSON.parse(data)).rates.BRL)
                } else {
                    amount = event.amount
                }

                times = amount / parseFloat(inputs.donateValue)
                await Neutralino.filesystem.appendFile(`./resumo ${currentLogFile}.txt`, `${event.username} doou R$${amount}\n`)
                mult = inputs.donateSelect === '1' ? 1 : 60

                if (!enableLimit.checked || (countDownDate + times * (parseFloat(inputs.donateCounter) * 1000 * mult)) <= maxTimeValue) {
                    countDownDate += times * (parseFloat(inputs.donateCounter) * 1000 * mult)
                } else {
                    limitReached = true
                    countDownDate = maxTimeValue
                }

                if (pause) {
                    await countDownFunction()
                }

                if (channelCheck.checked) {
                    updateWebTimer('update', countDownDate, running)
                }
                break
            case 'subscriber':
                await Neutralino.filesystem.appendFile(`./resumo ${currentLogFile}.txt`, `${event.username} se inscreveu.\n`)
                mult = inputs.subscriptionSelect === '1' ? 1 : 60

                if (!enableLimit.checked || (countDownDate + parseFloat(inputs.subscriptionCounter) * 1000 * mult) <= maxTimeValue) {
                    countDownDate += parseFloat(inputs.subscriptionCounter) * 1000 * mult
                } else {
                    limitReached = true
                    countDownDate = maxTimeValue
                }

                if (pause) {
                    await countDownFunction()
                }

                if (channelCheck.checked) {
                    updateWebTimer('update', countDownDate, running)
                }
                break
            case 'cheer':
                await Neutralino.filesystem.appendFile(`./resumo ${currentLogFile}.txt`, `${event.username} doou ${event.amount} bits.\n`)
                times = event.amount / parseFloat(inputs.bitsValue)
                mult = inputs.bitsSelect === '1' ? 1 : 60

                if (!enableLimit.checked || (countDownDate + times * (parseFloat(inputs.bitsCounter) * 1000) * mult) <= maxTimeValue) {
                    countDownDate += times * (parseFloat(inputs.bitsCounter) * 1000 * mult)
                } else {
                    limitReached = true
                    countDownDate = maxTimeValue
                }

                if (pause) {
                    await countDownFunction()
                }

                if (channelCheck.checked) {
                    updateWebTimer('update', countDownDate, running)
                }
                break
            default:
                break
        }
    }
}
