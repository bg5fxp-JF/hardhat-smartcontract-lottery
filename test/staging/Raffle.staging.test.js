const { developmentChains, netWorkConfig } = require("../../helper-hardhat-config");
const { deployments, ethers, getNamedAccounts, network } = require("hardhat");
const { assert, expect } = require("chai");

developmentChains.includes(network.name) ? describe.skip : describe("Raffle Staging Tests"),
    function () {
        let deployer, raffle, raffleAddress, raffleEntranceFee, interval;

        beforeEach(async function () {
            deployer = (await getNamedAccounts()).deployer;

            const deployerSigner = await ethers.getSigner(deployer);
            const Deployments = await deployments.fixture(["all"]);
            raffleAddress = Deployments.Raffle.address;
            raffle = await ethers.getContractAt("Raffle", raffleAddress, deployerSigner);

            raffleEntranceFee = await raffle.getEntranceFee();
        });

        describe("fulfillRandomWords", function () {
            it("works with live chainlink keepers and chainlink vrf, we get a random winner", async function () {
                const startingTimeStamp = raffle.getLastTimeStamp();
                const accounts = await ethers.getSigners();
                // set up listener before entering the raffle, incase chain moves fast
                await new Promise(async (resolve, reject) => {
                    raffle.once("WinnerPicked", async () => {
                        console.log("WinnerPicked event fired!");
                        try {
                            const recentWinner = await raffle.getRecentWinner();
                            const raffleState = await raffle.getRaffleState();
                            const winnerEndingBalance = await accounts[0].provider.getBalance(
                                accounts[0].address,
                            );
                            const endingTimeStamp = await raffle.getLastTimeStamp();

                            await expect(raffle.getPlayer(0)).to.be.reverted;
                            assert.equal(recentWinner.toString(), accounts[0].address);
                            assert.equal(raffleState.toString(), "0");
                            assert.equal(
                                winnerEndingBalance.toString(),
                                (winnerStartingBalance + raffleEntranceFee).toString(),
                            );
                            assert(endingTimeStamp > startingTimeStamp);
                            resolve();
                        } catch (e) {
                            console.log(e);
                            reject(e);
                        }
                    });

                    console.log("Entering Raffle...");
                    const tx = await raffle.enterRaffle({ value: raffleEntranceFee });
                    await tx.wait(1);
                    console.log("Ok, time to wait...");
                    const winnerStartingBalance = await accounts[0].provider.getBalance(
                        accounts[0].address,
                    );
                });
            });
        });
    };
