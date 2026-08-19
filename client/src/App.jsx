import { useState, useEffect } from 'react'
import './App.css'
import ethLogo from './assets/ethereum.svg'

// Import API functions
import {
  analyzeWallet,
  getWallets,
  updateWalletStatus,
  deleteWallet,
  getWalletTransactions
} from './services/api'

function App() {

  // Stores the wallet address entered by the user
  const [walletAddress, setWalletAddress] = useState('')

  // Stores messages shown to the user
  const [message, setMessage] = useState('')

  // Stores whether analysis is running
  const [loading, setLoading] = useState(false)

  // Stores all wallets
  const [wallets, setWallets] = useState([])

  // Stores transactions
  const [transactions, setTransactions] = useState([])

  // Stores D2 Counterparty Analytics
  const [counterpartyAnalytics, setCounterpartyAnalytics] = useState(null)

  // Stores selected D2 time period
  const [counterpartyPeriod, setCounterpartyPeriod] = useState('last7Days')

  // Stores hop trace
  const [hopTrace, setHopTrace] = useState([])

  // Stores risk summary
  const [riskSummary, setRiskSummary] = useState(null)

  // Controls which result section is currently being viewed
  const [viewMode, setViewMode] = useState('default')


  // Generate Risk Badge based on Wallet Status
  function getRiskBadge(status) {

    switch (status) {

      case 'Watchlist':
        return {
          text: '🟢 Low Risk',
          className: 'risk-low'
        }

      case 'Under Investigation':
        return {
          text: '🟡 Medium Risk',
          className: 'risk-medium'
        }

      case 'Confirmed':
        return {
          text: '🟠 High Risk',
          className: 'risk-high'
        }

      case 'High Risk':
        return {
          text: '🔴 Critical Risk',
          className: 'risk-critical'
        }

      default:
        return {
          text: '⚪ Unknown',
          className: 'risk-unknown'
        }

    }

  }


  // Load wallets when component mounts
  useEffect(() => {

    let ignore = false

    async function fetchData() {

      try {

        const data = await getWallets()

        if (!ignore) {
          setWallets(data.wallets)
        }

      } catch (error) {

        console.error(error)

      }

    }

    fetchData()

    return () => {
      ignore = true
    }

  }, [])


  // Analyze Wallet
  async function handleAnalyze() {

    if (walletAddress.trim() === '') {
      setMessage('❌ Please enter a wallet address.')
      return
    }

    if (!walletAddress.startsWith('0x')) {
      setMessage('❌ Wallet address must start with 0x.')
      return
    }

    if (walletAddress.length !== 42) {
      setMessage('❌ Wallet address must contain exactly 42 characters.')
      return
    }

    setLoading(true)
    setMessage('⏳ Analyzing wallet...')

    // Return to normal dashboard view
    setViewMode('default')

    try {

      const data = await analyzeWallet(walletAddress)

      // Refresh saved wallets
      const walletData = await getWallets()
      setWallets(walletData.wallets)

      // Fetch live transactions and analytics
      const transactionData =
        await getWalletTransactions(walletAddress)

      // Store transactions
      setTransactions(
        transactionData.transactions || []
      )

      // Store D2 Counterparty Analytics
      setCounterpartyAnalytics(
        transactionData.counterpartyAnalytics || null
      )

      // Store Hop Trace
      setHopTrace(
        transactionData.hopTrace || []
      )

      // Store Risk Summary
      setRiskSummary(
        transactionData.riskSummary || null
      )

      if (data.alreadyExists) {

        setMessage(
`⚠️ ${data.message}

Wallet:
${data.wallet}

Originally Saved:
${new Date(data.receivedAt).toLocaleString()}`
        )

      } else {

        setMessage(
`✅ ${data.message}

Wallet:
${data.wallet}

Received At:
${new Date(data.receivedAt).toLocaleString()}`
        )

      }

      setWalletAddress('')

    } catch (error) {

      console.error(error)

      setMessage(
        '❌ Unable to connect to backend server.'
      )

    } finally {

      setLoading(false)

    }

  }


  // View Transactions of a Saved Wallet
  async function handleViewTransactions(walletAddress) {

    try {

      setLoading(true)

      const transactionData =
        await getWalletTransactions(walletAddress)

      // Show normal transaction view
      setViewMode('transactions')

      setTransactions(
        transactionData.transactions || []
      )

      // Load D2 Counterparty Analytics
      setCounterpartyAnalytics(
        transactionData.counterpartyAnalytics || null
      )

      // Load Hop Trace
      setHopTrace(
        transactionData.hopTrace || []
      )

      // Load Risk Summary
      setRiskSummary(
        transactionData.riskSummary || null
      )

      setMessage(
`📜 Showing latest transactions for:

${walletAddress}`
      )

    } catch (error) {

      console.error(error)

      setMessage(
        '❌ Unable to load transactions.'
      )

    } finally {

      setLoading(false)

    }

  }


  // View Risk Summary of a Saved Wallet
  async function handleViewRiskSummary(walletAddress) {

    try {

      setLoading(true)

      const transactionData =
        await getWalletTransactions(walletAddress)

      // Clear transaction-related data
      setTransactions([])
      setCounterpartyAnalytics(null)
      setHopTrace([])

      // Store only risk summary
      setRiskSummary(
        transactionData.riskSummary || null
      )

      // Show only Risk Summary UI
      setViewMode('riskSummary')

      setMessage(
`🛡️ Showing risk summary for:

${walletAddress}`
      )

    } catch (error) {

      console.error(error)

      setMessage(
        '❌ Unable to load risk summary.'
      )

    } finally {

      setLoading(false)

    }

  }


  // Update Wallet Status
  async function handleStatusUpdate(id, status) {

    try {

      await updateWalletStatus(id, status)

      const data = await getWallets()

      setWallets(data.wallets)

      setMessage(
        '✅ Wallet status updated successfully.'
      )

    } catch (error) {

      console.error(error)

      setMessage(
        '❌ Unable to update wallet status.'
      )

    }

  }


  // Delete Wallet
  async function handleDeleteWallet(id) {

    const confirmDelete = window.confirm(
      'Are you sure you want to delete this wallet?'
    )

    if (!confirmDelete) return

    try {

      const data = await deleteWallet(id)

      const walletData = await getWallets()

      setWallets(walletData.wallets)

      setMessage(
        `✅ ${data.message}`
      )

    } catch (error) {

      console.error(error)

      setMessage(
        '❌ Unable to delete wallet.'
      )

    }

  }


  // Get selected counterparty period
  const selectedCounterparties =
    counterpartyAnalytics
      ? counterpartyAnalytics[counterpartyPeriod]
      : null


  return (

    <div className="container">

      {loading && (
        <div className="loading-overlay">

          <div className="loading-popup">

            <div className="loading-spinner"></div>

            <p>Analyzing wallet...</p>

          </div>

        </div>
      )}


      {/* ===========================
          Hero Section
      =========================== */}

      <div className="hero">

        <img
          src={ethLogo}
          alt="Ethereum Logo"
          className="eth-logo"
        />

        <h1>EVM Wallet Risk Analyzer</h1>

        <p className="subtitle">
          Analyze EVM wallet transactions and generate
          an explainable risk summary.
        </p>


        {/* Analyze Card */}

        <div className="card">

          <label htmlFor="wallet">
            Wallet Address
          </label>

          <input
            id="wallet"
            type="text"
            placeholder="Enter EVM wallet address (0x...)"
            value={walletAddress}
            onChange={(event) =>
              setWalletAddress(event.target.value)
            }
          />

          <button
            onClick={handleAnalyze}
            disabled={loading}
          >
            {loading
              ? 'Analyzing...'
              : 'Analyze Wallet'}
          </button>

        </div>

      </div>


      {/* ===========================
          Message
      =========================== */}

      <div className="message">

        <p>{message}</p>

      </div>


      {/* ===========================
          Saved Wallets
      =========================== */}

      <div className="wallet-section">

        <h2>Saved Wallets</h2>

        {wallets.length === 0 ? (

          <p>No wallets found.</p>

        ) : (

          <div className="wallet-grid">

            {wallets.map((wallet) => (

              <div
                key={wallet._id}
                className="wallet-card"
              >

                <strong>
                  Wallet Address
                </strong>

                <p>
                  {wallet.wallet}
                </p>


                {/* Risk Badge */}

                <div
                  className={
                    getRiskBadge(wallet.status).className
                  }
                >
                  {
                    getRiskBadge(wallet.status).text
                  }
                </div>


                <strong>
                  Status
                </strong>


                <select
                  className="status-select"
                  value={wallet.status}
                  onChange={(event) => {

                    const updatedWallets =
                      wallets.map((item) => {

                        if (
                          item._id === wallet._id
                        ) {

                          return {
                            ...item,
                            status:
                              event.target.value
                          }

                        }

                        return item

                      })

                    setWallets(updatedWallets)

                  }}
                >

                  <option>
                    Watchlist
                  </option>

                  <option>
                    Under Investigation
                  </option>

                  <option>
                    Confirmed
                  </option>

                  <option>
                    High Risk
                  </option>

                </select>


                <div className="button-group">

                  <button
                    className="view-btn"
                    onClick={() =>
                      handleViewTransactions(
                        wallet.wallet
                      )
                    }
                  >
                    View Transactions
                  </button>


                  <button
                    className="risk-summary-btn"
                    onClick={() =>
                      handleViewRiskSummary(
                        wallet.wallet
                      )
                    }
                  >
                    View Risk Summary
                  </button>


                  <button
                    className="update-btn"
                    onClick={() =>
                      handleStatusUpdate(
                        wallet._id,
                        wallet.status
                      )
                    }
                  >
                    Update Status
                  </button>


                  <button
                    className="delete-btn"
                    onClick={() =>
                      handleDeleteWallet(
                        wallet._id
                      )
                    }
                  >
                    Delete
                  </button>

                </div>


                <strong className="received-title">
                  Received At
                </strong>

                <p className="received-date">
                  {
                    new Date(
                      wallet.receivedAt
                    ).toLocaleString()
                  }
                </p>

              </div>

            ))}

          </div>

        )}

      </div>


      {/* =====================================================
          D2 - COUNTERPARTY ANALYTICS
          Hidden when viewing Risk Summary
      ===================================================== */}

      {viewMode !== 'riskSummary' && (

        <div className="transaction-section">

          <h2>
            Counterparty Analytics
          </h2>


          {!counterpartyAnalytics ? (

            <p>
              No counterparty analytics available.
            </p>

          ) : (

            <>

              {/* Time Period Buttons */}

              <div className="counterparty-periods">

                <button
                  className={
                    counterpartyPeriod === 'last7Days'
                      ? 'period-btn active'
                      : 'period-btn'
                  }
                  onClick={() =>
                    setCounterpartyPeriod(
                      'last7Days'
                    )
                  }
                >
                  Last 7 Days
                </button>


                <button
                  className={
                    counterpartyPeriod === 'last30Days'
                      ? 'period-btn active'
                      : 'period-btn'
                  }
                  onClick={() =>
                    setCounterpartyPeriod(
                      'last30Days'
                    )
                  }
                >
                  Last 30 Days
                </button>


                <button
                  className={
                    counterpartyPeriod === 'allTime'
                      ? 'period-btn active'
                      : 'period-btn'
                  }
                  onClick={() =>
                    setCounterpartyPeriod(
                      'allTime'
                    )
                  }
                >
                  All Time
                </button>

              </div>


              {/* ===========================
                  Incoming Counterparties
              =========================== */}

              <div className="counterparty-direction">

                <h3 className="incoming-title">
                  Incoming Counterparties
                </h3>


                {!selectedCounterparties ||
                selectedCounterparties.incoming.length === 0 ? (

                  <p>
                    No incoming counterparties found.
                  </p>

                ) : (

                  <div className="wallet-grid">

                    {selectedCounterparties.incoming.map(
                      (party, index) => (

                        <div
                          key={`incoming-${index}`}
                          className="wallet-card counterparty-card"
                        >

                          <div className="direction-badge incoming-badge">
                            ↓ Incoming
                          </div>


                          <strong>
                            Wallet
                          </strong>

                          <p>
                            {party.wallet}
                          </p>


                          <strong>
                            Name
                          </strong>

                          <p>
                            {party.name || 'Unknown'}
                          </p>


                          <strong>
                            Exposure Tag
                          </strong>

                          <p
                            className={`counterparty-tag tag-${(
                              party.tag || 'Unknown'
                            )
                              .toLowerCase()
                              .replace(/\s+/g, '-')}`}
                          >
                            {party.tag || 'Unknown'}
                          </p>


                          <strong>
                            Total Interactions
                          </strong>

                          <p>
                            {party.interactions}
                          </p>


                          <strong>
                            Last Transaction
                          </strong>

                          <p>
                            {
                              party.lastTransaction
                                ? new Date(
                                    party.lastTransaction
                                  ).toLocaleString()
                                : 'Unknown'
                            }
                          </p>


                          <strong>
                            Transaction Hash
                          </strong>

                          <p>
                            {party.transactionHash}
                          </p>


                          <strong>
                            Block Number
                          </strong>

                          <p>
                            {party.blockNumber}
                          </p>

                        </div>

                      )
                    )}

                  </div>

                )}

              </div>


              {/* ===========================
                  Outgoing Counterparties
              =========================== */}

              <div className="counterparty-direction">

                <h3 className="outgoing-title">
                  Outgoing Counterparties
                </h3>


                {!selectedCounterparties ||
                selectedCounterparties.outgoing.length === 0 ? (

                  <p>
                    No outgoing counterparties found.
                  </p>

                ) : (

                  <div className="wallet-grid">

                    {selectedCounterparties.outgoing.map(
                      (party, index) => (

                        <div
                          key={`outgoing-${index}`}
                          className="wallet-card counterparty-card"
                        >

                          <div className="direction-badge outgoing-badge">
                            ↑ Outgoing
                          </div>


                          <strong>
                            Wallet
                          </strong>

                          <p>
                            {party.wallet}
                          </p>


                          <strong>
                            Name
                          </strong>

                          <p>
                            {party.name || 'Unknown'}
                          </p>


                          <strong>
                            Exposure Tag
                          </strong>

                          <p
                            className={`counterparty-tag tag-${(
                              party.tag || 'Unknown'
                            )
                              .toLowerCase()
                              .replace(/\s+/g, '-')}`}
                          >
                            {party.tag || 'Unknown'}
                          </p>


                          <strong>
                            Total Interactions
                          </strong>

                          <p>
                            {party.interactions}
                          </p>


                          <strong>
                            Last Transaction
                          </strong>

                          <p>
                            {
                              party.lastTransaction
                                ? new Date(
                                    party.lastTransaction
                                  ).toLocaleString()
                                : 'Unknown'
                            }
                          </p>


                          <strong>
                            Transaction Hash
                          </strong>

                          <p>
                            {party.transactionHash}
                          </p>


                          <strong>
                            Block Number
                          </strong>

                          <p>
                            {party.blockNumber}
                          </p>

                        </div>

                      )
                    )}

                  </div>

                )}

              </div>

            </>

          )}

        </div>

      )}


      {/* =====================================================
          Hop Trace Section
          Hidden when viewing Risk Summary
      ===================================================== */}

      {viewMode !== 'riskSummary' && (

        <div className="transaction-section">

          <h2>
            2–3 Hop Trace
          </h2>


          {hopTrace.length === 0 ? (

            <p>
              No hop trace available.
            </p>

          ) : (

            <div className="wallet-grid">

              {hopTrace.map((trace, index) => (

                <div
                  key={index}
                  className="wallet-card"
                >

                  <strong>
                    Hop Level
                  </strong>

                  <p>
                    {
                      trace.hop
                        ? `Hop ${trace.hop}`
                        : 'Hop 1'
                    }
                  </p>


                  <strong>
                    Source Wallet
                  </strong>

                  <p>
                    {trace.sourceWallet}
                  </p>


                  <strong>
                    Related Wallet
                  </strong>

                  <p>
                    {trace.relatedWallet}
                  </p>


                  <strong>
                    Reason
                  </strong>

                  <p>
                    {trace.reason}
                  </p>


                  <strong>
                    Name
                  </strong>

                  <p>
                    {trace.name || 'Unknown'}
                  </p>


                  <strong>
                    Exposure Tag
                  </strong>

                  <p>
                    {trace.tag || 'Unknown'}
                  </p>


                  <strong>
                    Transaction
                  </strong>

                  <p>
                    {trace.transactionHash}
                  </p>


                  <strong>
                    Block
                  </strong>

                  <p>
                    {trace.blockNumber}
                  </p>

                </div>

              ))}

            </div>

          )}

        </div>

      )}


      {/* =====================================================
          Risk Summary
          Always shown
      ===================================================== */}

      <div className="transaction-section">

        <h2>
          Risk Summary
        </h2>


        {!riskSummary ? (

          <p>
            No risk summary available.
          </p>

        ) : (

          <div className="wallet-card">

            <strong>
              Risk Level
            </strong>

            <p>
              {riskSummary.riskLevel}
            </p>


            <br />


            <strong>
              Flags
            </strong>

            <ul>

              {riskSummary.flags.map(
                (flag, index) => (

                  <li key={index}>
                    {flag}
                  </li>

                )
              )}

            </ul>


            <br />


            <strong>
              Explanations
            </strong>

            <ul>

              {riskSummary.explanations.map(
                (exp, index) => (

                  <li key={index}>
                    {exp}
                  </li>

                )
              )}

            </ul>

          </div>

        )}

      </div>


      {/* =====================================================
          Transactions Section
          Hidden when viewing Risk Summary
      ===================================================== */}

      {viewMode !== 'riskSummary' && (

        <div className="transaction-section">

          <h2>
            Recent Transactions
          </h2>


          {transactions.length === 0 ? (

            <p>
              No transactions found.
            </p>

          ) : (

            <div className="wallet-grid">

              {transactions
                .slice(0, 10)
                .map((tx, index) => (

                  <div
                    key={index}
                    className="wallet-card"
                  >

                    <strong>
                      Transaction Hash
                    </strong>

                    <p>
                      {tx.hash}
                    </p>


                    <strong>
                      From
                    </strong>

                    <p>
                      {tx.from_address}
                    </p>


                    <strong>
                      To
                    </strong>

                    <p>
                      {tx.to_address}
                    </p>


                    <strong>
                      Value
                    </strong>

                    <p>
                      {tx.value}
                    </p>


                    <strong>
                      Block
                    </strong>

                    <p>
                      {tx.block_number}
                    </p>

                  </div>

                ))}

            </div>

          )}

        </div>

      )}

    </div>

  )

}

export default App