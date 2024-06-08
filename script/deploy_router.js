// 0xf49b48c2eb6d863e4979c0fbdc918e0e9b4f46a5
const privateKey = process.env.PRIKEY

async function deployRouter(w) {
    const routerContract = await ethers.getContractFactory("SwapRouter", w);
    const r = await routerContract.deploy(
        "0xc95D939Da72ECe8Bd794d42EaEd28974CDb0ADa2",
        "0x5F8D4232367759bCe5d9488D3ade77FCFF6B9b6B"
    );
    const tx = await r.deployed();
    console.log("finish to deploy factory, address:", r.address);
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
    await deployRouter(w);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

