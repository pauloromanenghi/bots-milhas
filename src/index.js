const { LatamBot } = require('./scripts/latam-bot')

const latam = new LatamBot()

;(async() => {

    try {

        await latam.initialize()

        const date_start = new Date('2023-02-01')
        const date_end = new Date('2023-02-14')
        
        console.time()

        for await(const data of latam.loadBy('GRU', 'FLN', date_start, date_end)){
            console.log('result:', JSON.stringify(data))
        }

    } catch (err) {

        console.error('error', err)

    } finally {

        await latam.stop()

        console.timeEnd()
    }


})();