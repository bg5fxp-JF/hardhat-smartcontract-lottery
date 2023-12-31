const netWorkConfig = {
    11155111: {
        name: "sepolia",
        vrfCoordinatorV2: "0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625",
        raffleEntranceFee: ethers.parseEther("0.01"), // 0.01 ETH
        gasLane: "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c", // 30 gwei
        subscriptionId: "6165",
        callbackGasLimit: "500000", // 500,000 gas
        keepersUpdateInterval: "30",
    },
    31337: {
        name: "hardhat",
        raffleEntranceFee: ethers.parseEther("0.01"), // 0.01 ETH
        gasLane: "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c", // 30 gwei
        callbackGasLimit: "500000", // 500,000 gas
        keepersUpdateInterval: "30",
    },
};

const developmentChains = ["hardhat", "localhost"];
const VERIFICATION_BLOCK_CONFIRMATIONS = 6;

module.exports = {
    netWorkConfig,
    developmentChains,
    VERIFICATION_BLOCK_CONFIRMATIONS,
};
