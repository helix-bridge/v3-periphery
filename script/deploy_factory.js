const privateKey = process.env.PRIKEY

async function deployFactory(w) {
    const factoryContract = await ethers.getContractFactory("UniswapV3Factory", w);
    const f = await factoryContract.deploy();
    const tx = await f.waitForDeployment();
    const address = await f.getAddress();
    console.log("finish to deploy factory, address:", address);
    return address;
}

function wallet(url) {
    const provider = new ethers.JsonRpcProvider(url);
    const wallet = new ethers.Wallet(privateKey, provider);
    return wallet;
}

// 2. deploy mapping token factory
async function main() {
    const url = "https://testnet-rpc.bitlayer.org";
    const w = wallet(url);
    await deployFactory(w);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

