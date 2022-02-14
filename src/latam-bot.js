const puppeteer = require('puppeteer')
const csvjson = require('csvjson')
const { writeFile } = require('fs/promises')

Date.prototype.getLastDateOfYear = function() {
    this.setMonth(11)
    this.setDate(31)
    return this
}

Date.prototype.addDays = function(value) {
    this.setDate(this.getDate() + value)
    return this
}

class LatamBot {

    constructor() {
        this.base_url = `https://www.latam.com/pt_br/apps/personas/booking`
        this.default_start_at = new Date()
        this.default_stop_at = new Date().getLastDateOfYear()
    }

    async initialize() {

        this.browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null,
            userDataDir: './cache',
            args: [
                '--no-sandbox',
                '--ignore-certificate-errors',  
                '--disable-setuid-sandbox',
                '--blink-settings=imagesEnabled=false',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--disable-gpu',
                '--no-zygote',
                '--single-process'
            ]
        })
    
        this.page = await this.browser.newPage()   

        await this.page.setRequestInterception(true);

        this.page.on('request', (request) => {
            if (request.resourceType() === 'image'|| request.resourceType() === 'stylesheet'|| request.resourceType() === 'font') request.abort();
            else request.continue();
        });

    }

    async *loadBy(fromCity, toCity, startAt = this.default_start_at, stopAt = this.default_stop_at, extractFunction) {

        const [year, month, day] = startAt.toISOString().slice(0, 10).split('-')

        const uri = `${this.base_url}?fecha1_dia=${day}&fecha1_anomes=${year}-${month}&from_city1=${fromCity}&to_city1=${toCity}&nadults=1&nchildren=0&ninfants=0&ida_vuelta=ida&cabina=Y&application=lanpass#/`
        
        const result = await this.goToPage(uri, extractFunction)

        yield result
        
        if(startAt.getTime() === stopAt.getTime()) {
            return
        } 

        startAt.addDays(1)

        await new Promise(resolve => setTimeout(resolve, 5000))

        yield* this.loadBy(fromCity, toCity, startAt, stopAt, extractFunction)

    }

    async goToPage(url, extractFunction) {

        await this.page.goto(url, {
            waitUntil: ['load', 'domcontentloaded', 'networkidle0', 'networkidle2'],
            timeout: 0
        })     

        const result = await this.page.evaluate(
            Object.assign(extractFunction)
        )

        return result   
    }

    extractPrices() {

        const data = []
        const elements = document.getElementsByClassName('flight')

        const dateSelected = document.getElementsByClassName('week-view-day selected')[0]
                                           .getElementsByTagName('time')[0]
                                           .getAttribute('datetime')

        for(let element of elements){

            const flightElement = element.getElementsByClassName('flight-container')[0]
            const departureElement = element.getElementsByClassName('departure')[0]
            const arrivalElement = element.getElementsByClassName('arrival')[0]
            const flightFarePriceElement = element.getElementsByClassName('flight-fare-price-label')[0]
            
            const flightCode = flightElement.getAttribute('id')
            const departureAirport = departureElement.getElementsByTagName('abbr')[0].textContent
            const departureTime = departureElement.getElementsByTagName('time')[0].getAttribute('datetime')
            const arrivalAirport = arrivalElement.getElementsByTagName('abbr')[0].textContent
            const arrivalDateTime = arrivalElement.getElementsByTagName('time')[0].getAttribute('datetime')

            const flightPrice = flightFarePriceElement.getElementsByClassName('value')[0].textContent
            const flightPriceType = flightFarePriceElement.getElementsByClassName('currency-symbol currency-symbol-redemption')[0].textContent

            const result = {
                flight_code: flightCode,
                departure_airport: departureAirport,
                departure_date_time: `${dateSelected} ${departureTime}`,
                arrival_airport: arrivalAirport,
                arrival_date_time: `${dateSelected} ${arrivalDateTime}`,
                price_value: flightPrice,
                price_type: flightPriceType
            }

            data.push(result)
        }

        return data
    }

    async close() {
        await this.browser.close()
    }

}


;(async() => {

    const latam = new LatamBot()

    try {

        const date_start = new Date('2022-02-14')
        const date_end = new Date('2022-04-30')

        const data = []

        await latam.initialize()

        for await(const values of latam.loadBy('GRU', 'FLN', date_start, date_end, latam.extractPrices)){
            console.log(values)
            values.map(value => data.push(value))
        }

        const csvData = csvjson.toCSV(data, {
            headers: 'key'
        })

        await writeFile(`./data/latam_data.csv`, csvData)

    } catch (err) {
        console.error('error', err)
    } finally {
        await latam.close()
    }


})();