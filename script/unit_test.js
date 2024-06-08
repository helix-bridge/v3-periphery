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
      await token0.deployed();
      let token1 = await erc20Contract.deploy(10000000000000);
      await token1.deployed();
      let token2 = await erc20Contract.deploy(10000000000000);
      await token2.deployed();

      if (token0.address.toLowerCase() > token1.address.toLowerCase()) {
          const tmp = token0;
          token0 = token1;
          token1 = tmp;
      }

      // deploy factory
      const factoryContract = await ethers.getContractFactory("UniswapV3Factory");
      const factory = await factoryContract.deploy();
      await factory.deployed();

      // deploy SwapRouter
      const swapRouterContract = await ethers.getContractFactory("SwapRouter");
      const swapRouter = await swapRouterContract.deploy(factory.address, token0.address);
      await swapRouter.deployed();

      // deploy NonfungibleTokenPositionDescriptor
      const nftDescriptionContract = await ethers.getContractFactory("NonfungibleTokenPositionDescriptor");
      const nftDescription = await nftDescriptionContract.deploy(token0.address); 
      await nftDescription.deployed();

      // deploy NonfungiblePositionManager
      const nftContract = await ethers.getContractFactory("NonfungiblePositionManager");
      const nft = await nftContract.deploy(factory.address, token0.address, nftDescription.address); 
      await nft.deployed();

      // deploy quoter
      const quoterContract = await ethers.getContractFactory("QuoterV2");
      const quoter = await quoterContract.deploy(factory.address, token0.address); 
      await quoter.deployed();

      // create pool
      await nft.createAndInitializePoolIfNecessary(
          token0.address,
          token1.address,
          500,
          "0x1000000000000000000000000"
      );

      const poolAddress = await factory.getPool(token0.address, token1.address, 500);
      console.log("new pool address is", poolAddress);
      const pool = await ethers.getContractAt("UniswapV3Pool", poolAddress);

      await token0.approve(nft.address, 10000000000000);
      await token1.approve(nft.address, 10000000000000);
      await token2.approve(nft.address, 10000000000000);
      // mint
      await nft.mint(
          [
              token0.address,
              token1.address,
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

      const tx = await quoter.callStatic.quoteExactInputSingle(
          [
              token1.address,
              token0.address,
              10000,
              500,
              "0x1200000000000000000000000"
          ]
      );
      console.log(tx);

      await token1.approve(swapRouter.address, 10000000000000);
      // swap
      await swapRouter.exactInputSingle(
          [
              token1.address,
              token0.address,
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
      const burnAmount = await nft.callStatic.decreaseLiquidity(
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
          token1.address,
          token2.address,
          500,
          "0x2000000000000000000000000"
      );

      await nft.mint(
          [
              token1.address,
              token2.address,
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
              token0.address,
              token1.address,
              token2.address
          ],
          [500, 500]
      );
      await token0.approve(swapRouter.address, 10000000000000);
      const amountOut = await quoter.callStatic.quoteExactInput(
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

