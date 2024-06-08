// 0xf6c4bb32d3d3765ac9847bc97350f9972ab46bf0
const privateKey = process.env.PRIKEY

async function deployQuoterV2(w) {
    const quoterContract = await ethers.getContractFactory("QuoterV2", w);
    const r = await quoterContract.deploy(
        "0xc95D939Da72ECe8Bd794d42EaEd28974CDb0ADa2",
        "0x5F8D4232367759bCe5d9488D3ade77FCFF6B9b6B"
    );
    const tx = await r.deployed();
    console.log("finish to deploy quoterv2, address:", r.address);
    return r.address;
}

function wallet(url) {
    const provider = new ethers.providers.JsonRpcProvider(url);
    const wallet = new ethers.Wallet(privateKey, provider);
    return wallet;
}

// 2. deploy mapping token factory
async function main() {
    const url = "https://testnet-rpc.bitlayer.org";
    const w = wallet(url);
    await deployQuoterV2(w);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

