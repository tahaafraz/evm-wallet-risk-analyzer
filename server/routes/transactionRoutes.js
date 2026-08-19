const express = require("express");
const router = express.Router();

const Moralis = require("moralis").default;

const exposureTags = require("../data/exposureTags");
const generateRiskSummary = require("../utils/riskEngine");

// ==========================================
// Settings for Multi-Hop Trace
// ==========================================

const MAX_HOPS = 3;
const MAX_COUNTERPARTIES_PER_HOP = 5;

// ==========================================
// Get normal wallet transactions
// ==========================================

async function getWalletTransactions(walletAddress) {
    const response =
        await Moralis.EvmApi.transaction.getWalletTransactions({
            chain: "0x1",
            address: walletAddress
        });

    return response.raw.result || [];
}

// ==========================================
// Get ERC-20 token transfers
// ==========================================

async function getTokenTransfers(walletAddress) {
    try {
        const response =
            await Moralis.EvmApi.token.getWalletTokenTransfers({
                chain: "0x1",
                address: walletAddress
            });

        return response.raw.result || [];
    } catch (error) {
        console.error(
            "Token transfer error:",
            error.message
        );

        return [];
    }
}

// ==========================================
// Enrich transactions with token transfers
// ==========================================

function enrichTransactions(
    transactions,
    tokenTransfers
) {
    const tokenMap = {};

    tokenTransfers.forEach((transfer) => {
        if (!transfer.transaction_hash) {
            return;
        }

        const hash =
            transfer.transaction_hash.toLowerCase();

        if (!tokenMap[hash]) {
            tokenMap[hash] = [];
        }

        tokenMap[hash].push({
            tokenAddress:
                transfer.address || null,

            tokenName:
                transfer.token_name || "Unknown",

            tokenSymbol:
                transfer.token_symbol || "Unknown",

            tokenDecimals:
                Number(
                    transfer.token_decimals || 0
                ),

            amount:
                transfer.value || "0",

            from:
                transfer.from_address || null,

            to:
                transfer.to_address || null
        });
    });

    return transactions.map((tx) => {
        const hash =
            tx.hash
                ? tx.hash.toLowerCase()
                : "";

        const transfers =
            tokenMap[hash] || [];

        return {
            ...tx,

            nativeValue:
                tx.value || "0",

            tokenTransfers:
                transfers
        };
    });
}

// ==========================================
// Get transaction timestamp
// ==========================================

function getTransactionDate(tx) {
    if (!tx.block_timestamp) {
        return null;
    }

    const date =
        new Date(tx.block_timestamp);

    if (isNaN(date.getTime())) {
        return null;
    }

    return date;
}

// ==========================================
// Check whether transaction is inside period
// ==========================================

function isWithinPeriod(
    tx,
    days
) {
    const transactionDate =
        getTransactionDate(tx);

    if (!transactionDate) {
        return false;
    }

    const now =
        new Date();

    const cutoff =
        new Date(
            now.getTime() -
            days * 24 * 60 * 60 * 1000
        );

    return transactionDate >= cutoff;
}

// ==========================================
// Extract directional counterparties
// ==========================================
//
// Returns:
//
// {
//   wallet,
//   direction: "in" | "out",
//   interactions,
//   transactionHash,
//   blockNumber
// }
//
// ==========================================

function extractCounterparties(
    transactions,
    walletAddress
) {
    const counterpartyMap = {};

    const normalizedWallet =
        walletAddress.toLowerCase();

    transactions.forEach((tx) => {
        let counterparty = "";
        let direction = "";

        // ======================================
        // Incoming
        // ======================================

        if (
            tx.to_address &&
            tx.to_address.toLowerCase() ===
                normalizedWallet
        ) {
            counterparty =
                tx.from_address;

            direction = "in";
        }

        // ======================================
        // Outgoing
        // ======================================

        else if (
            tx.from_address &&
            tx.from_address.toLowerCase() ===
                normalizedWallet
        ) {
            counterparty =
                tx.to_address;

            direction = "out";
        }

        if (!counterparty || !direction) {
            return;
        }

        const normalizedCounterparty =
            counterparty.toLowerCase();

        // Don't count wallet itself
        if (
            normalizedCounterparty ===
            normalizedWallet
        ) {
            return;
        }

        const key =
            `${normalizedCounterparty}_${direction}`;

        if (!counterpartyMap[key]) {
            counterpartyMap[key] = {
                wallet:
                    normalizedCounterparty,

                direction,

                interactions: 1,

                transactionHash:
                    tx.hash,

                blockNumber:
                    tx.block_number,

                lastTransaction:
                    tx.block_timestamp || null
            };
        } else {
            counterpartyMap[key]
                .interactions++;

            // Keep most recent transaction
            const currentDate =
                getTransactionDate(tx);

            const previousDate =
                getTransactionDate({
                    block_timestamp:
                        counterpartyMap[key]
                            .lastTransaction
                });

            if (
                currentDate &&
                (
                    !previousDate ||
                    currentDate > previousDate
                )
            ) {
                counterpartyMap[key]
                    .transactionHash =
                    tx.hash;

                counterpartyMap[key]
                    .blockNumber =
                    tx.block_number;

                counterpartyMap[key]
                    .lastTransaction =
                    tx.block_timestamp || null;
            }
        }
    });

    return Object.values(counterpartyMap);
}

// ==========================================
// Build Top Counterparties for a period
// ==========================================

function buildTopCounterparties(
    transactions,
    walletAddress,
    days = null
) {
    let filteredTransactions =
        transactions;

    // ==========================================
    // Apply time filter
    // ==========================================

    if (days !== null) {
        filteredTransactions =
            transactions.filter(
                (tx) =>
                    isWithinPeriod(tx, days)
            );
    }

    const extracted =
        extractCounterparties(
            filteredTransactions,
            walletAddress
        );

    // ==========================================
    // Add exposure information
    // ==========================================

    return extracted
        .map((party) => {
            const exposure =
                exposureTags[
                    party.wallet
                ];

            return {
                wallet:
                    party.wallet,

                direction:
                    party.direction,

                interactions:
                    party.interactions,

                name:
                    exposure
                        ? exposure.name
                        : "Unknown",

                tag:
                    exposure
                        ? exposure.tag
                        : "Unknown",

                transactionHash:
                    party.transactionHash,

                blockNumber:
                    party.blockNumber,

                lastTransaction:
                    party.lastTransaction
            };
        })

        // ==========================================
        // Highest interaction first
        // ==========================================

        .sort(
            (a, b) =>
                b.interactions -
                a.interactions
        )

        // ==========================================
        // Top 10
        // ==========================================

        .slice(0, 10);
}

// ==========================================
// Build D2 Analytics
// ==========================================

function buildCounterpartyAnalytics(
    transactions,
    walletAddress
) {
    return {
        allTime: {
            incoming:
                buildTopCounterparties(
                    transactions,
                    walletAddress,
                    null
                ).filter(
                    (party) =>
                        party.direction === "in"
                ),

            outgoing:
                buildTopCounterparties(
                    transactions,
                    walletAddress,
                    null
                ).filter(
                    (party) =>
                        party.direction === "out"
                )
        },

        last30Days: {
            incoming:
                buildTopCounterparties(
                    transactions,
                    walletAddress,
                    30
                ).filter(
                    (party) =>
                        party.direction === "in"
                ),

            outgoing:
                buildTopCounterparties(
                    transactions,
                    walletAddress,
                    30
                ).filter(
                    (party) =>
                        party.direction === "out"
                )
        },

        last7Days: {
            incoming:
                buildTopCounterparties(
                    transactions,
                    walletAddress,
                    7
                ).filter(
                    (party) =>
                        party.direction === "in"
                ),

            outgoing:
                buildTopCounterparties(
                    transactions,
                    walletAddress,
                    7
                ).filter(
                    (party) =>
                        party.direction === "out"
                )
        }
    };
}

// ==========================================
// GET Transactions + D2 + D3 + D4 + D5
// ==========================================

router.get("/:wallet", async (req, res) => {
    try {
        const walletAddress =
            req.params.wallet.toLowerCase();

        // ==========================================
        // Check Exposure Tag
        // ==========================================

        const walletExposure =
            exposureTags[walletAddress];

        // ==========================================
        // Get Seed Wallet Transactions
        // ==========================================

        const transactions =
            await getWalletTransactions(
                walletAddress
            );

        // ==========================================
        // Get ERC-20 Token Transfers
        // ==========================================

        const tokenTransfers =
            await getTokenTransfers(
                walletAddress
            );

        // ==========================================
        // Enrich Transactions
        // ==========================================

        const enrichedTransactions =
            enrichTransactions(
                transactions,
                tokenTransfers
            );

        // ==========================================
        // D2 - Counterparty Analytics
        // ==========================================

        const counterpartyAnalytics =
            buildCounterpartyAnalytics(
                transactions,
                walletAddress
            );

        // ==========================================
        // Existing top 10 counterparties
        // Keep this for compatibility with
        // existing D3/D4/D5/D6 code
        // ==========================================

        const directCounterparties =
            extractCounterparties(
                transactions,
                walletAddress
            );

        const counterparties =
            directCounterparties
                .map((party) => {
                    const exposure =
                        exposureTags[
                            party.wallet
                        ];

                    return {
                        wallet:
                            party.wallet,

                        direction:
                            party.direction,

                        interactions:
                            party.interactions,

                        name:
                            exposure
                                ? exposure.name
                                : "Unknown",

                        tag:
                            exposure
                                ? exposure.tag
                                : "Unknown",

                        transactionHash:
                            party.transactionHash,

                        blockNumber:
                            party.blockNumber,

                        lastTransaction:
                            party.lastTransaction
                    };
                })
                .sort(
                    (a, b) =>
                        b.interactions -
                        a.interactions
                )
                .slice(0, 10);

        // ==========================================
        // D3 - 1–3 Hop Trace
        // ==========================================

        const hopTrace = [];

        const visitedWallets =
            new Set();

        visitedWallets.add(
            walletAddress
        );

        let currentFrontier = [
            walletAddress
        ];

        // ==========================================
        // Traverse up to 3 hops
        // ==========================================

        for (
            let hop = 1;
            hop <= MAX_HOPS;
            hop++
        ) {
            const walletTransactionResults =
                await Promise.all(
                    currentFrontier.map(
                        async (currentWallet) => {

                            if (
                                currentWallet ===
                                walletAddress
                            ) {
                                return {
                                    wallet:
                                        currentWallet,

                                    transactions
                                };
                            }

                            const walletTransactions =
                                await getWalletTransactions(
                                    currentWallet
                                );

                            return {
                                wallet:
                                    currentWallet,

                                transactions:
                                    walletTransactions
                            };
                        }
                    )
                );

            const nextFrontier = [];

            for (
                const walletData
                of walletTransactionResults
            ) {
                const currentWallet =
                    walletData.wallet;

                const walletTransactions =
                    walletData.transactions;

                const discoveredCounterparties =
                    extractCounterparties(
                        walletTransactions,
                        currentWallet
                    );

                const limitedCounterparties =
                    discoveredCounterparties
                        .sort(
                            (a, b) =>
                                b.interactions -
                                a.interactions
                        )
                        .slice(
                            0,
                            MAX_COUNTERPARTIES_PER_HOP
                        );

                for (
                    const party
                    of limitedCounterparties
                ) {
                    const relatedWallet =
                        party.wallet;

                    if (
                        visitedWallets.has(
                            relatedWallet
                        )
                    ) {
                        continue;
                    }

                    visitedWallets.add(
                        relatedWallet
                    );

                    const exposure =
                        exposureTags[
                            relatedWallet
                        ];

                    hopTrace.push({
                        hop,

                        sourceWallet:
                            currentWallet,

                        relatedWallet,

                        direction:
                            party.direction,

                        reason:
                            hop === 1
                                ? "Direct Transfer"
                                : "Counterparty of Previous Hop",

                        transactionHash:
                            party.transactionHash,

                        blockNumber:
                            party.blockNumber,

                        name:
                            exposure
                                ? exposure.name
                                : "Unknown",

                        tag:
                            exposure
                                ? exposure.tag
                                : "Unknown"
                    });

                    nextFrontier.push(
                        relatedWallet
                    );
                }
            }

            if (
                nextFrontier.length === 0
            ) {
                break;
            }

            currentFrontier =
                nextFrontier;
        }

        // ==========================================
        // Risk Counterparties
        // ==========================================

        const riskCounterparties = [
            ...counterparties
        ];

        if (walletExposure) {
            riskCounterparties.unshift({
                wallet:
                    walletAddress,

                interactions:
                    0,

                name:
                    walletExposure.name,

                tag:
                    walletExposure.tag
            });
        }

        // ==========================================
        // Risk Summary
        // ==========================================

        const riskSummary =
            generateRiskSummary(
                riskCounterparties,
                hopTrace,
                enrichedTransactions
            );

        // ==========================================
        // Response
        // ==========================================

        res.json({
            success: true,

            transactions:
                enrichedTransactions,

            tokenTransfers,

            // Existing structure
            counterparties,

            // ======================================
            // D2 NEW
            // ======================================

            counterpartyAnalytics,

            // D3
            hopTrace,

            // D5
            riskSummary,

            // D4
            walletExposure:
                walletExposure || null
        });
    }

    catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,

            message:
                error.message
        });
    }
});

module.exports = router;