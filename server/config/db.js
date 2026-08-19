const mongoose = require('mongoose')

async function connectDB() {

  try {

    await mongoose.connect('mongodb://127.0.0.1:27017/evm_wallet_analyzer')

    console.log('✅ MongoDB Connected Successfully')

  } catch (error) {

    console.error('❌ MongoDB Connection Failed')
    console.error(error)

    process.exit(1)

  }

}

module.exports = connectDB