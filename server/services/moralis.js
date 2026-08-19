const Moralis = require("moralis").default

async function startMoralis() {

    try {

        await Moralis.start({

            apiKey: process.env.MORALIS_API_KEY

        })

        console.log("✅ Moralis Connected Successfully")

    }

    catch (error) {

        console.log("❌ Moralis Connection Failed")

        console.error(error)

    }

}

module.exports = startMoralis