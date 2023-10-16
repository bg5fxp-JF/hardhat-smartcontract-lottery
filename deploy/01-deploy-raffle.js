const { network, ethers } = require("hardhat");
const {
    netWorkConfig,
    developmentChains,
    VERIFICATION_BLOCK_CONFIRMATIONS,
} = require("../helper-hardhat-config");
const { verify } = require("../utils/verify");
require("dotenv").config();

const FUND_AMOUNT = ethers.parseEther("20");

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const waitBlockConfirmations = developmentChains.includes(network.name)
        ? 1
        : VERIFICATION_BLOCK_CONFIRMATIONS;
    const chainId = network.config.chainId;

    let vrfCoordinatorV2MockAddress, subscriptionId, vrfCoordinatorV2MockContract;

    if (developmentChains.includes(network.name)) {
        const vrfCoordinatorV2Mock = await deployments.get("VRFCoordinatorV2Mock");
        //check
        vrfCoordinatorV2MockAddress = vrfCoordinatorV2Mock.address;
        vrfCoordinatorV2MockContract = await ethers.getContractAt(
            "VRFCoordinatorV2Mock",
            vrfCoordinatorV2MockAddress,
        );
        const transactionResponse = await vrfCoordinatorV2MockContract.createSubscription();
        const transactionReceipt = await transactionResponse.wait();

        subscriptionId = transactionReceipt.logs[0].args.subId;

        // subscriptionId = "1";
        await vrfCoordinatorV2MockContract.fundSubscription(subscriptionId, FUND_AMOUNT);
    } else {
        vrfCoordinatorV2MockAddress = netWorkConfig[chainId]["vrfCoordinatorV2"];
        subscriptionId = netWorkConfig[chainId]["subscriptionId"];
    }
    const entranceFee = netWorkConfig[chainId]["raffleEntranceFee"];
    const gasLane = netWorkConfig[chainId]["gasLane"];
    const callbackGasLimit = netWorkConfig[chainId]["callbackGasLimit"];
    const updateInterval = netWorkConfig[chainId]["keepersUpdateInterval"];

    const args = [
        vrfCoordinatorV2MockAddress,
        entranceFee,
        gasLane,
        subscriptionId,
        callbackGasLimit,
        updateInterval,
    ];
    const raffle = await deploy("Raffle", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: waitBlockConfirmations,
    });

    if (developmentChains.includes(network.name)) {
        await vrfCoordinatorV2MockContract.addConsumer(subscriptionId, raffle.address);
    }

    // if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
    //     // verify
    //     await verify(raffle.address, args);
    // }
    log("==========================================================================");
};

module.exports.tags = ["all", "raffle"];
