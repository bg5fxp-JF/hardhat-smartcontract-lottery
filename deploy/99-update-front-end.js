const { deployments, ethers, network } = require("hardhat");
require("dotenv").config();
const fs = require("fs");

const FRONTEND_ADDRESSES_FILE = "../nextjs-smart-contract-lottery/constants/contractAddresses.json";
const FRONTEND_ABI_FILE = "../nextjs-smart-contract-lottery/constants/abi.json";

async function updateAbi() {
    const Deployments = await deployments.fixture(["raffle", "mocks"]);
    const raffleAbi = Deployments.Raffle.abi;

    // const raffleAddress = (await deployments.fixture(["raffle"])).address;
    // const raffle = await ethers.getContractAt("Raffle", raffleAddress);

    fs.writeFileSync(FRONTEND_ABI_FILE, JSON.stringify(raffleAbi));
}

async function updateContractAddresses() {
    const Deployment = await deployments.fixture(["raffle", "mocks"]);
    const raffleAddress = Deployment.Raffle.address;
    const chainId = network.config.chainId.toString();
    const currentAddress = JSON.parse(fs.readFileSync(FRONTEND_ADDRESSES_FILE, "utf8"));
    if (chainId in currentAddress) {
        if (!currentAddress[chainId].includes(raffleAddress)) {
            currentAddress[chainId].push(raffleAddress);
        }
    } else {
        currentAddress[chainId] = [raffleAddress];
    }

    fs.writeFileSync(FRONTEND_ADDRESSES_FILE, JSON.stringify(currentAddress));
}

module.exports = async function () {
    if (process.env.UPDATE_FRONTEND) {
        console.log("Updating frontend");
        await updateAbi();
        await updateContractAddresses();
    }
};

module.exports.tags = ["all", "frontend"];
