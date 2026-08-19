const mongoose = require('mongoose')

const walletSchema = new mongoose.Schema({

  wallet: {
    type: String,
    required: true,
    unique: true
  },

  // Wallet Status
  status: {
    type: String,
    default: 'Watchlist'
  },

  receivedAt: {
    type: Date,
    default: Date.now
  }

})

module.exports = mongoose.model('Wallet', walletSchema)