const { developmentChains, netWorkConfig } = require("../../helper-hardhat-config");
const { deployments, ethers, getNamedAccounts, network } = require("hardhat");
const { assert, expect } = require("chai");

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Unit Tests", function () {
          let deployer, VRFCoordinatorV2Mock, raffle, raffleAddress, raffleEntranceFee, interval;
          const chainId = network.config.chainId;

          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer;

              const deployerSigner = await ethers.getSigner(deployer);
              const Deployments = await deployments.fixture(["all"]);
              raffleAddress = Deployments.Raffle.address;
              raffle = await ethers.getContractAt("Raffle", raffleAddress, deployerSigner);
              const VRFCoordinatorV2MockAddress = Deployments.VRFCoordinatorV2Mock.address;
              VRFCoordinatorV2Mock = await ethers.getContractAt(
                  "VRFCoordinatorV2Mock",
                  VRFCoordinatorV2MockAddress,
                  deployerSigner,
              );
              raffleEntranceFee = await raffle.getEntranceFee();
              interval = await raffle.getInterval();
          });

          describe("constructor", function () {
              it("initialises the raffle correctly", async function () {
                  const raffleState = await raffle.getRaffleState();

                  assert.equal(
                      interval.toString(),
                      netWorkConfig[chainId]["keepersUpdateInterval"],
                  );
                  assert.equal(raffleState.toString(), "0");
              });
          });

          describe("enterRaffle", function () {
              it("reverts if not enough is paid", async function () {
                  await expect(raffle.enterRaffle()).to.be.revertedWithCustomError(
                      raffle,
                      "Raffle__NotEnoughToEnter",
                  );
              });

              it("records players when they enter", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  const playerFromContract = await raffle.getPlayer(0);
                  assert.equal(playerFromContract, deployer);
              });

              it("emits event when entered", async function () {
                  await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.emit(
                      raffle,
                      "RaffleEntered",
                  );
              });

              it("should revert when raffle is not open", async function () {
                  // making Upkeep be needed to perform Upkeep and set Raffle state to calculating
                  // has players and has balance made true
                  await raffle.enterRaffle({ value: raffleEntranceFee });

                  // elapsing time so that timePassed is made true
                  await network.provider.send("evm_increaseTime", [Number(interval) + 1]);
                  await network.provider.request({ method: "evm_mine", params: [] });

                  await raffle.performUpkeep("0x");

                  await expect(
                      raffle.enterRaffle({ value: raffleEntranceFee }),
                  ).to.be.revertedWithCustomError(raffle, "Raffle__RaffleIsNotOpen");
              });
          });

          describe("checkUpkeep", function () {
              it("returns false if people haven't sent any eth", async function () {
                  await network.provider.send("evm_increaseTime", [Number(interval) + 1]);
                  await network.provider.request({ method: "evm_mine", params: [] });

                  const { upkeepNeeded } = await raffle.checkUpkeep.staticCall("0x");

                  assert(!upkeepNeeded);
              });
              it("returns false if raffle isn't open", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  await network.provider.send("evm_increaseTime", [Number(interval) + 1]);
                  await network.provider.request({ method: "evm_mine", params: [] });

                  await raffle.performUpkeep("0x");
                  const { upkeepNeeded } = await raffle.checkUpkeep.staticCall("0x");
                  const raffleState = await raffle.getRaffleState();
                  assert(raffleState.toString(), "1");
                  assert(!upkeepNeeded);
              });
              it("returns false if enough time hasn't passed", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  await network.provider.send("evm_increaseTime", [Number(interval) - 15]);
                  await network.provider.request({ method: "evm_mine", params: [] });

                  const { upkeepNeeded } = await raffle.checkUpkeep.staticCall("0x");

                  assert(!upkeepNeeded);
              });
              it("retruns true when all checks pass", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  await network.provider.send("evm_increaseTime", [Number(interval) + 1]);
                  await network.provider.request({ method: "evm_mine", params: [] });

                  const { upkeepNeeded } = await raffle.checkUpkeep.staticCall("0x");

                  assert(upkeepNeeded);
              });
          });

          describe("performUpkeep", function () {
              it("reverts if upkeep is not needed", async function () {
                  await expect(raffle.performUpkeep("0x")).to.be.revertedWithCustomError(
                      raffle,
                      "Raffle__UpkeepNotNeeded",
                  );
              });

              it("sets state to calculating, emits an event and calls vrf coordinator", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  await network.provider.send("evm_increaseTime", [Number(interval) + 1]);
                  await network.provider.request({ method: "evm_mine", params: [] });

                  const txResponse = await raffle.performUpkeep("0x");
                  const txReceipt = await txResponse.wait(1);

                  const raffleState = await raffle.getRaffleState();
                  const requestId = await txReceipt.logs[1].args.requestId;

                  assert.equal(raffleState.toString(), "1");
                  assert(Number(requestId) > 0);
              });
          });

          describe("fulfillRandomWords", function () {
              beforeEach(async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  await network.provider.send("evm_increaseTime", [Number(interval) + 1]);
                  await network.provider.request({ method: "evm_mine", params: [] });
              });

              it("can only be called after performUpkeep", async function () {
                  await expect(
                      VRFCoordinatorV2Mock.fulfillRandomWords(0, raffleAddress),
                  ).to.be.revertedWith("nonexistent request");
                  await expect(
                      VRFCoordinatorV2Mock.fulfillRandomWords(1, raffleAddress),
                  ).to.be.revertedWith("nonexistent request");
              });

              it("picks a winner, resets the lottery and sends money", async function () {
                  const additionalEntrants = 3;
                  const startingAccountIndex = 1;
                  const accounts = await ethers.getSigners();

                  for (
                      let i = startingAccountIndex;
                      i < startingAccountIndex + additionalEntrants;
                      i++
                  ) {
                      const accountConnectedRaffle = raffle.connect(accounts[i]);
                      await accountConnectedRaffle.enterRaffle({ value: raffleEntranceFee });
                  }

                  const startingTimeStamp = await raffle.getLastTimeStamp();

                  await new Promise(async (resolve, reject) => {
                      raffle.once("WinnerPicked", async () => {
                          console.log("WinnerPicked event fired!");
                          try {
                              const recentWinner = await raffle.getRecentWinner();
                              const raffleState = await raffle.getRaffleState();
                              const endingTimeStamp = await raffle.getLastTimeStamp();
                              const numPlayers = await raffle.getNumberOfPlayers();
                              const winnerEndingBalance = await accounts[1].provider.getBalance(
                                  accounts[1].address,
                              );
                              assert.equal(numPlayers.toString(), "0");
                              assert.equal(raffleState.toString(), "0");
                              assert(endingTimeStamp > startingTimeStamp);
                              assert.equal(
                                  winnerEndingBalance.toString(),
                                  (
                                      winnerStartingBalance +
                                      raffleEntranceFee * BigInt(additionalEntrants) +
                                      raffleEntranceFee
                                  ).toString(),
                              );
                          } catch (e) {
                              reject(e);
                          }
                          resolve();
                      });
                      const tx = await raffle.performUpkeep("0x");
                      const txReceipt = await tx.wait(1);
                      const winnerStartingBalance = await accounts[1].provider.getBalance(
                          accounts[1].address,
                      );

                      await VRFCoordinatorV2Mock.fulfillRandomWords(
                          txReceipt.logs[1].args.requestId,
                          raffleAddress,
                      );
                  });
              });
          });
      });
