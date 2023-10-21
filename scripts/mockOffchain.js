const { ethers, network, deployments } = require("hardhat");

async function mockKeepers() {
    // const Deployments = await deployments.fixture(["raffle", "mocks"]);
    // const raffleAddress = Deployments.Raffle.address;
    const raffleAddress = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";
    const raffle = await ethers.getContractAt("Raffle", raffleAddress);
    // await raffle.enterRaffle({ value: ethers.parseUnits("0.01") });
    console.log(await raffle.getNumberOfPlayers());
    const checkData = ethers.keccak256(ethers.toUtf8Bytes(""));
    const { upkeepNeeded } = await raffle.checkUpkeep.staticCall(checkData);

    if (upkeepNeeded) {
        const tx = await raffle.performUpkeep(checkData);
        const txReceipt = await tx.wait(1);
        const requestId = txReceipt.logs[1].args.requestId;
        console.log(`Performed upkeep with RequestId: ${requestId}`);
        if (network.config.chainId == 31337) {
            await mockVrf(requestId, raffleAddress);
        }
    } else {
        console.log("No upkeep needed!");
    }
}

async function mockVrf(requestId, raffleAddress) {
    console.log("We on a local network? Ok let's pretend...");
    const Deployments = await deployments.fixture(["raffle", "mocks"]);
    // const vrfAddress = await Deployments.VRFCoordinatorV2Mock.address;
    const vrfAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    const vrfCoordinatorV2Mock = await ethers.getContractAt("VRFCoordinatorV2Mock", vrfAddress);
    const raffle = await ethers.getContractAt("Raffle", raffleAddress);
    await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, raffleAddress);
    console.log("Responded!");
    const recentWinner = await raffle.getRecentWinner();
    console.log(`The winner is: ${recentWinner}`);
}

mockKeepers()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
