const { LatamBot } = require('./latam-bot')

const latam = new LatamBot()

;(async() => {

    try {

        await latam.initialize()

        const date_start = new Date('2022-03-06')
        const date_end = new Date('2022-12-31')
        
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