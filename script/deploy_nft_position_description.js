// 0xe76ada110b0b0b0e4781a7d619283818fc9146f6
const privateKey = process.env.PRIKEY

async function deployNFTPositionDescriptor(w) {
    const descriptorContract = await ethers.getContractFactory("NonfungibleTokenPositionDescriptor", w);
    const r = await descriptorContract.deploy(
        "0x31264bfa70d9db2cf8b495a1ea70d03d7e630bb7",
    );
    const tx = await r.waitForDeployment();
    const address = await r.getAddress();
    console.log("finish to deploy descriptor, address:", address);
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
    await deployNFTPositionDescriptor(w);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

