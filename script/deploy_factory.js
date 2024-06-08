const privateKey = process.env.PRIKEY

async function deployFactory(w) {
    const factoryContract = await ethers.getContractFactory("UniswapV3Factory", w);
    const f = await factoryContract.deploy();
    const tx = await f.deployed();
    console.log("finish to deploy factory, address:", f.address);
    return f.address;
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
    await deployFactory(w);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

