require('dotenv').config()

const express = require('express')
console.log('🚀 NEW INDEX.JS IS RUNNING')
const cors = require('cors')

// Import MongoDB connection
const connectDB = require('./config/db')

// Import Moralis
const startMoralis = require('./services/moralis')

// Import Transaction Routes
const transactionRoutes = require('./routes/transactionRoutes')

// Import Wallet Model
const Wallet = require('./models/Wallet')

const app = express()

const PORT = 3001

// Connect to MongoDB
connectDB()

// Start Moralis
startMoralis()

// Allow React frontend to communicate with backend
app.use(cors())

// Allow backend to receive JSON data
app.use(express.json())

// Transaction Routes
app.use('/transactions', transactionRoutes)

// Home Route
app.get('/', (req, res) => {
  res.send('EVM Wallet Risk Analyzer Backend is Running!')
})

// Analyze Wallet Route
app.post('/analyze', async (req, res) => {

  try {

    // Get wallet address from frontend
    const { wallet } = req.body

    console.log('Wallet Received:', wallet)

    // Check if wallet already exists
    let existingWallet = await Wallet.findOne({ wallet })

    if (!existingWallet) {

      // Save new wallet
      existingWallet = await Wallet.create({
        wallet
      })

      console.log('✅ Wallet Saved to MongoDB')

      return res.json({
        success: true,
        alreadyExists: false,
        message: 'Wallet saved successfully!',
        wallet: existingWallet.wallet,
        receivedAt: existingWallet.receivedAt
      })

    } else {

      console.log('ℹ️ Wallet already exists')

      return res.json({
        success: true,
        alreadyExists: true,
        message: 'Wallet already exists.',
        wallet: existingWallet.wallet,
        receivedAt: existingWallet.receivedAt
      })

    }

  } catch (error) {

    console.error(error)

    res.status(500).json({
      success: false,
      message: 'Something went wrong.'
    })

  }

})

// Get All Wallets Route
app.get('/wallets', async (req, res) => {

  try {

    const wallets = await Wallet.find()

    res.json({
      success: true,
      count: wallets.length,
      wallets: wallets
    })

  } catch (error) {

    console.error(error)

    res.status(500).json({
      success: false,
      message: 'Unable to fetch wallets.'
    })

  }

})

// Update Wallet Status
app.put('/wallet/:id/status', async (req, res) => {

  try {

    const { id } = req.params
    const { status } = req.body

    const updatedWallet = await Wallet.findByIdAndUpdate(

      id,

      {
        status: status
      },

      {
        new: true
      }

    )

    if (!updatedWallet) {

      return res.status(404).json({
        success: false,
        message: 'Wallet not found.'
      })

    }

    res.json({
      success: true,
      message: 'Wallet status updated successfully.',
      wallet: updatedWallet
    })

  } catch (error) {

    console.error(error)

    res.status(500).json({
      success: false,
      message: 'Unable to update wallet status.'
    })

  }

})

// Delete Wallet
app.delete('/wallet/:id', async (req, res) => {

  try {

    const { id } = req.params

    const deletedWallet = await Wallet.findByIdAndDelete(id)

    if (!deletedWallet) {

      return res.status(404).json({
        success: false,
        message: 'Wallet not found.'
      })

    }

    res.json({
      success: true,
      message: 'Wallet deleted successfully.',
      wallet: deletedWallet
    })

  } catch (error) {

    console.error(error)

    res.status(500).json({
      success: false,
      message: 'Unable to delete wallet.'
    })

  }

})

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})