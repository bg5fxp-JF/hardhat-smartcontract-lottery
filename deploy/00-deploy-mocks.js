const { network, ethers } = require("hardhat");
const { developmentChains } = require("../helper-hardhat-config");

const BASE_FEE = ethers.parseEther("0.25"); // 0.25 is this the premium in LINK
const GAS_PRICE_LINK = 1e9; // link per gas, 0.000000001 LINK per gas

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const args = [BASE_FEE, GAS_PRICE_LINK];

    if (developmentChains.includes(network.name)) {
        log("On a developer chain. Deploying Mocks...");
        await deploy("VRFCoordinatorV2Mock", {
            from: deployer,
            log: true,
            args: args,
        });

        log("Mocks deplyed");
        log("==========================================================================");
        log(
            "You are deploying to a local network, you'll need a local network running to interact",
        );
        log(
            "Please run `npx hardhat console --network localhost` to interact with the deployed smart contracts!",
        );
        log("==========================================================================");
    }
};

module.exports.tags = ["all", "mocks"];
