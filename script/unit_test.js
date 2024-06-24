const { expect } = require("chai");
const { solidity } = require("ethereum-waffle");
const chai = require("chai");
const ethUtil = require('ethereumjs-util');
const abi = require('ethereumjs-abi');
const secp256k1 = require('secp256k1');

chai.use(solidity);

const FEE_SIZE = 3

function encodePath(path, fees) {
  if (path.length != fees.length + 1) {
      return;
  }

  let encoded = '0x'
  for (let i = 0; i < fees.length; i++) {
    // 20 byte encoding of the address
    encoded += path[i].slice(2)
    // 3 byte encoding of the fee
    encoded += fees[i].toString(16).padStart(2 * FEE_SIZE, '0')
  }
  // encode the final token
  encoded += path[path.length - 1].slice(2)

  return encoded.toLowerCase()
}



describe("uniswap unit test", () => {
  before(async () => {
  });

  it("test_flow", async function () {
      const [owner, relayer, user, slasher] = await ethers.getSigners();
      // deploy erc20 token contract
      const erc20Contract = await ethers.getContractFactory("TestERC20");
      let token0 = await erc20Contract.deploy(10000000000000);
      await token0.waitForDeployment();
      let token1 = await erc20Contract.deploy(10000000000000);
      await token1.waitForDeployment();
      let token2 = await erc20Contract.deploy(10000000000000);
      await token2.waitForDeployment();

      if (await token0.getAddress() > await token1.getAddress()) {
          const tmp = token0;
          token0 = token1;
          token1 = tmp;
      }

      // deploy factory
      const factoryContract = await ethers.getContractFactory("UniswapV3Factory");
      const factory = await factoryContract.deploy();
      await factory.waitForDeployment();

      // deploy SwapRouter
      const swapRouterContract = await ethers.getContractFactory("SwapRouter");
      const swapRouter = await swapRouterContract.deploy(await factory.getAddress(), await token0.getAddress());
      await swapRouter.waitForDeployment();

      // deploy NonfungibleTokenPositionDescriptor
      const nftDescriptionContract = await ethers.getContractFactory("NonfungibleTokenPositionDescriptor");
      const nftDescription = await nftDescriptionContract.deploy(await token0.getAddress()); 
      await nftDescription.waitForDeployment();

      // deploy NonfungiblePositionManager
      const nftContract = await ethers.getContractFactory("NonfungiblePositionManager");
      const nft = await nftContract.deploy(await factory.getAddress(), await token0.getAddress(), await nftDescription.getAddress()); 
      await nft.waitForDeployment();

      // deploy quoter
      const quoterContract = await ethers.getContractFactory("QuoterV2");
      const quoter = await quoterContract.deploy(await factory.getAddress(), await token0.getAddress()); 
      await quoter.waitForDeployment();

      // create pool
      await nft.createAndInitializePoolIfNecessary(
          await token0.getAddress(),
          await token1.getAddress(),
          500,
          "0x1000000000000000000000000"
      );

      const poolAddress = await factory.getPool(await token0.getAddress(), await token1.getAddress(), 500);
      console.log("new pool address is", poolAddress);
      const pool = await ethers.getContractAt("UniswapV3Pool", poolAddress);

      await token0.approve(await nft.getAddress(), 10000000000000);
      await token1.approve(await nft.getAddress(), 10000000000000);
      await token2.approve(await nft.getAddress(), 10000000000000);
      // mint
      await nft.mint(
          [
              await token0.getAddress(),
              await token1.getAddress(),
              500,
              -2230, // 0.8, lowprice
              1820, // 1.2, upprice
              1000000000000,
              1000000000000,
              0,
              0,
              owner.address,
              1810000000
          ]
      );
      // add more liquidity
      await nft.increaseLiquidity(
          [
              1, // tokenId
              1000000,
              1000000,
              100000,
              100000,
              1810000000
          ]
      );

      let position = await nft.positions(1);
      console.log("position is", position);

      const tx = await quoter.quoteExactInputSingle.staticCall(
          [
              await token1.getAddress(),
              await token0.getAddress(),
              10000,
              500,
              "0x1200000000000000000000000"
          ]
      );
      console.log(tx);

      await token1.approve(await swapRouter.getAddress(), 10000000000000);
      // swap
      await swapRouter.exactInputSingle(
          [
              await token1.getAddress(),
              await token0.getAddress(),
              500,
              owner.address,
              1810000000,
              1000,
              900,
              "0x1200000000000000000000000"
          ]
      );
      position = await nft.positions(1);
      console.log("position after swap is", position);

      // decrease liquidity
      //await nft.approve(owner.address, 1)
      const burnAmount = await nft.decreaseLiquidity.staticCall(
          [
              1,
              478357044538,
              0,
              0,
              1810000000
          ]
      );
      console.log("burn liquidity getAmount", burnAmount);

      // path router
      // 0-1, 1-2
      await nft.createAndInitializePoolIfNecessary(
          await token1.getAddress(),
          await token2.getAddress(),
          500,
          "0x2000000000000000000000000"
      );

      await nft.mint(
          [
              await token1.getAddress(),
              await token2.getAddress(),
              500,
              0, // 1.0, lowprice
              9160, // 2.5 upprice
              100000000000,
              100000000000,
              0,
              0,
              owner.address,
              1810000000
          ]
      );

      const path = encodePath(
          [
              await token0.getAddress(),
              await token1.getAddress(),
              await token2.getAddress()
          ],
          [500, 500]
      );
      await token0.approve(await swapRouter.getAddress(), 10000000000000);
      const amountOut = await quoter.quoteExactInput.staticCall(
          path,
          1000
      );
      console.log("estimate amountOut", amountOut);
      await swapRouter.exactInput(
          [
              path,
              owner.address,
              1810000000,
              1000,
              amountOut.amountOut
          ]
      );

      console.log("unit test finished");
  });
});

