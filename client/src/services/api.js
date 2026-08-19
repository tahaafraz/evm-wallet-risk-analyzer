const BASE_URL = 'http://localhost:3001'

// Send wallet to backend
export async function analyzeWallet(wallet) {

  const response = await fetch(`${BASE_URL}/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      wallet
    })
  })

  return await response.json()

}


// Get all wallets from backend
export async function getWallets() {

  const response = await fetch(`${BASE_URL}/wallets`)

  return await response.json()

}


// Update wallet status
export async function updateWalletStatus(id, status) {

  const response = await fetch(`${BASE_URL}/wallet/${id}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      status
    })
  })

  return await response.json()

}


// Delete wallet
export async function deleteWallet(id) {

  const response = await fetch(`${BASE_URL}/wallet/${id}`, {
    method: 'DELETE'
  })

  return await response.json()

}


// Fetch wallet transactions from Moralis
export async function getWalletTransactions(wallet) {

  const response = await fetch(`${BASE_URL}/transactions/${wallet}`)

  return await response.json()

}