const { LatamBot } = require('./latam-bot')
const csvjson = require('csvjson')
const { writeFile } = require('fs/promises')


;(async() => {

    const latam = new LatamBot()

    try {

        const date_start = new Date('2022-03-01')
        const date_end = new Date('2022-03-31')

        const data = []

        await latam.initialize()

        for await(const value of latam.createUrlList('GRU', 'FLN', date_start, date_end)){
            console.log(value)
            data.push(value)
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