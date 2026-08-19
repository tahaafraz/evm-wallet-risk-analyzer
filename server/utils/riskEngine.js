function generateRiskSummary(
    counterparties,
    hopTrace = [],
    transactions = []
) {

    let riskLevel = "Low";

    // Remove duplicate flags
    const flags = new Set();

    // Remove duplicate explanations
    const explanations = new Set();

    // Store linked transaction evidence
    const linkedTransactions = [];

    // ==========================================
    // Analyze Counterparties
    // ==========================================

    counterparties.forEach((party) => {

        switch (party.tag) {

            case "Exchange":

                flags.add("Exchange Interaction");

                explanations.add(
                    `Interacted with exchange: ${party.name}`
                );

                break;

            case "Stablecoin":

                flags.add("Stablecoin Interaction");

                explanations.add(
                    `Interacted with stablecoin: ${party.name}`
                );

                break;

            case "Bridge":

                if (riskLevel !== "Critical") {
                    riskLevel = "Medium";
                }

                flags.add("Bridge Interaction");

                explanations.add(
                    `Interacted with bridge: ${party.name}`
                );

                break;

            case "DEX":

                if (riskLevel !== "Critical") {
                    riskLevel = "Medium";
                }

                flags.add("DEX Interaction");

                explanations.add(
                    `Interacted with DEX: ${party.name}`
                );

                break;

            case "Lending":

                if (riskLevel !== "Critical") {
                    riskLevel = "Medium";
                }

                flags.add("Lending Protocol");

                explanations.add(
                    `Interacted with lending protocol: ${party.name}`
                );

                break;

            case "High Risk":

                riskLevel = "Critical";

                flags.add("High Risk Contract");

                explanations.add(
                    `Interacted with HIGH RISK contract: ${party.name}`
                );

                break;

            default:
                break;

        }

    });

    // ==========================================
    // Link Evidence Transactions
    // ==========================================

    hopTrace.forEach((hop) => {

        if (!hop.transactionHash) {
            return;
        }

        const relatedParty =
            counterparties.find(
                (party) =>
                    party.wallet &&
                    party.wallet.toLowerCase() ===
                    hop.relatedWallet.toLowerCase()
            );

        if (!relatedParty) {
            return;
        }

        // Only link transactions that have
        // a meaningful exposure tag
        if (
            relatedParty.tag &&
            relatedParty.tag !== "Unknown"
        ) {

            linkedTransactions.push({

                transactionHash:
                    hop.transactionHash,

                wallet:
                    hop.relatedWallet,

                name:
                    relatedParty.name,

                tag:
                    relatedParty.tag,

                hop:
                    hop.hop

            });

        }

    });

    // ==========================================
    // Remove Duplicate Evidence
    // ==========================================

    const uniqueEvidence = [];

    const evidenceHashes = new Set();

    linkedTransactions.forEach((transaction) => {

        if (
            transaction.transactionHash &&
            !evidenceHashes.has(
                transaction.transactionHash
            )
        ) {

            evidenceHashes.add(
                transaction.transactionHash
            );

            uniqueEvidence.push(
                transaction
            );

        }

    });

    // ==========================================
    // Convert Sets into Arrays
    // ==========================================

    const uniqueFlags = [
        ...flags
    ];

    const uniqueExplanations = [
        ...explanations
    ];

    // ==========================================
    // Return Risk Summary
    // ==========================================

    return {

        riskLevel,

        flags:
            uniqueFlags,

        explanations:
            uniqueExplanations,

        linkedTransactions:
            uniqueEvidence

    };

}

module.exports = generateRiskSummary;