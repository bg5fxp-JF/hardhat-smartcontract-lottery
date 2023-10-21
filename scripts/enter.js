async function enter() {
    const raffleAddress = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";
    const raffle = await ethers.getContractAt("Raffle", raffleAddress);
    await raffle.enterRaffle({ value: ethers.parseUnits("0.01") });
    console.log("enterd!");
}

enter()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
