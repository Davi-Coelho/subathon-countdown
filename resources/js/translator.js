"use strict"

class Translator {
    constructor() {
        this._lang = this.getLanguage()
        this._elements = document.querySelectorAll("[data-i18n]")
    }

    getLanguage() {
        const lang = navigator.languages ? navigator.languages[0] : navigator.language
        return lang.substring(0, 2)
    }

    getCurrentLanguage() {
        return this._lang
    }

    load(lang = null) {
        if (lang) {
            this._lang = lang
        }

        fetch(`../locales/${this._lang}.json`)
            .then(response => response.json())
            .then(translation => {
                this.translate(translation)
                this.toogleLangTag()
            })
            .catch(() => {
                console.error(`Could not load ${this._lang}.json.`)
            })
    }

    translate(translation) {
        this._elements.forEach(element => {
            let keys = element.dataset.i18n.split(".")
            let text = keys.reduce((obj, i) => obj[i], translation)

            if(text) {
                if (element.tagName === "INPUT") {
                    element.value = text
                } else if (element.tagName  === "IMG") {
                    element.title = text
                } else {
                    element.innerHTML = text
                }
            }
        })
    }

    async loadOne(value, lang = null) {
        if (lang) {
            this._lang = lang
        }

        let newValue = await fetch(`../locales/${this._lang}.json`)
        newValue = await newValue.json()

        return newValue[value]
    }

    toogleLangTag() {
        if (document.documentElement.lang !== this._lang) {
            document.documentElement.lang = this._lang
        }
    }
}
