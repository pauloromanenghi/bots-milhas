const { LatamBot } = require('./latam-bot')
const { Kafka, CompressionTypes, logLevel } = require('kafkajs')

const host = '0.0.0.0'

const latam = new LatamBot()

const kafka = new Kafka({    
    brokers: [`${host}:9092`],
    clientId: 'latam-consumer'
})

const topic = 'latam-topic'
const consumer = kafka.consumer({ groupId: 'default' })

;(async() => {

    await consumer.connect()

    await consumer.subscribe({ topic, fromBeginning: true })

    const errorTypes = ['unhandledRejection', 'uncaughtException']
    const signalTraps = ['SIGTERM', 'SIGINT', 'SIGUSR2']

    errorTypes.forEach(type => {
        process.on(type, async e => {
            try {
                console.log(`process.on ${type}`)
                console.error(e)
                await consumer.disconnect()
                process.exit(0)
            } catch (_) {
                process.exit(1)
            }
        })
    })

    signalTraps.forEach(type => {
        process.once(type, async () => {
            try {
                await consumer.disconnect()
            } finally {
                process.kill(process.pid, type)
            }
        })
    })

    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            const prefix = `${topic}[${partition} | ${message.offset}] / ${message.timestamp}`

            console.log(`- ${prefix} #${message.value}`)

            const { uri } = message.value

            for await(const value of latam.loadByUrl.apply(uri)){
                console.log(uri, value)
            }
        },
    })

})();