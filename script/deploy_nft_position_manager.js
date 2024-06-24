// 0xedfc8539905e6e40699ab134710c272a8bbdb32e
const privateKey = process.env.PRIKEY

async function deployNftManager(w) {
    const nftPositionManagerContract = await ethers.getContractFactory("NonfungiblePositionManager", w);
    const r = await nftPositionManagerContract.deploy(
        "0xc95D939Da72ECe8Bd794d42EaEd28974CDb0ADa2",
        "0x5F8D4232367759bCe5d9488D3ade77FCFF6B9b6B",
        "0x61b6b8c7c00aa7f060a2bedee6b11927cc9c3ef1"
    );
    const tx = await r.waitForDeployment();
    const address = await r.getAddress();
    console.log("finish to deploy nft position manager, address:", address);
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
    await deployNftManager(w);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

