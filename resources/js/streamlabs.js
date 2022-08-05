function streamlabsConnect() {
    document.dispatchEvent(new Event('streamlabsConnected'))
}

function streamlabsDisconnect() {
    document.dispatchEvent(new Event('streamlabsDisconnected'))
}

async function streamlabsEvent(eventData) {

    const event = eventData.message[0]
    let mult = null
    console.log(eventData)

    if (!eventData.for && eventData.type === 'donation' && enableCounter.checked && !pause) {
        let amount = 0

        if (event.currency !== 'BRL') {
            console.log('Convertendo...')
            await fetch(`https://api.exchangerate.host/latest?base=${event.currency}&amount=${event.amount}&symbols=BRL`)
                .then(response => response.text())
                .then(data => amount = (JSON.parse(data)).rates.BRL)
        } else {
            amount = event.amount
        }

        const times = amount / parseFloat(inputs.donateValue)
        await Neutralino.filesystem.appendFile(`./resumo ${currentLogFile}.txt`, `${event.from} doou R$${amount}\n`)
        mult = inputs.donateSelect === '1' ? 1 : 60
        
        if (!enableLimit.checked || (countDownDate + times * (parseFloat(inputs.donateCounter) * 1000 * mult)) <= maxTimeValue) {
            countDownDate += times * (parseFloat(inputs.donateCounter) * 1000 * mult)
        } else {
            countDownDate = maxTimeValue
        }
        updateWebTimer('update', countDownDate, true)
    }
    if (eventData.for === 'twitch_account' && enableCounter.checked && !pause && (socketCheck.checked || !jwtCheck.checked)) {
        switch (eventData.type) {
            case 'subscription':
                await Neutralino.filesystem.appendFile(`./resumo ${currentLogFile}.txt`, `${event.name} se inscreveu.\n`)
                mult = inputs.subscriptionSelect === '1' ? 1 : 60

                if (!enableLimit.checked || (countDownDate + parseFloat(inputs.subscriptionCounter) * 1000 * mult) <= maxTimeValue) {
                    countDownDate += parseFloat(inputs.subscriptionCounter) * 1000 * mult
                } else {
                    countDownDate = maxTimeValue
                }
                break
            case 'resub':
                await Neutralino.filesystem.appendFile(`./resumo ${currentLogFile}.txt`, `${event.name} se inscreveu.\n`)
                mult = inputs.subscriptionSelect === '1' ? 1 : 60

                if (!enableLimit.checked || (countDownDate + parseFloat(inputs.subscriptionCounter) * 1000 * mult) <= maxTimeValue) {
                    countDownDate += parseFloat(inputs.subscriptionCounter) * 1000 * mult
                } else {
                    countDownDate = maxTimeValue
                }
                break
            case 'bits':
                await Neutralino.filesystem.appendFile(`./resumo ${currentLogFile}.txt`, `${event.name} doou ${event.amount} bits.\n`)
                const times = event.amount / parseFloat(inputs.bitsValue)
                mult = inputs.bitsSelect === '1' ? 1 : 60
                
                if (!enableLimit.checked || (countDownDate + times * (parseFloat(inputs.bitsCounter) * 1000) * mult) <= maxTimeValue) {
                    countDownDate += times * (parseFloat(inputs.bitsCounter) * 1000 * mult)
                } else {
                    countDownDate = maxTimeValue
                }
                break
        }
        updateWebTimer('update', countDownDate, true)
    }
}
