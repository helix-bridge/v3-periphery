const privateKey = process.env.PRIKEY

const nftDescription = "0x61B6B8c7C00aA7F060a2BEDeE6b11927CC9c3eF1";
const factory = "0xc95D939Da72ECe8Bd794d42EaEd28974CDb0ADa2";
const nftManager = "0x6b5622503fe2ca3cd371f7dfe5393df04b63ce22";
const router = "0xcEEA9fF9d924a3023E5a59610F1ee7cbE287116F";
const quoterv2 = "0x6677D5Bb2Bc48f4F35E2a9b516bb29fBc1d22049";
const usdc = "0x209ba92b5Cc962673a30998ED7A223109D0BE5e8";
const usdt = "0xab40Fe1DaE842B209599269B8DafB0c54a743438";
const brc = "0xf4340CF5F3891A3827713b33f769b501A0b5b122";
const wbtc = "0x5F8D4232367759bCe5d9488D3ade77FCFF6B9b6B";

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



function wallet(url) {
    const provider = new ethers.JsonRpcProvider(url);
    const wallet = new ethers.Wallet(privateKey, provider);
    return wallet;
}

function sqrtPriceX96(price) {
    const x96 = BigInt("0x1000000000000000000000000");
    const scalePrice = ethers.parseEther(`${Math.sqrt(price)}`);
    console.log(scalePrice, scalePrice * x96);
    return scalePrice * x96 / ethers.parseEther("1.0");
}

// must token0 < token1
async function createNewPoolAndInitLiquidity(w, token0, token1, price) {
    const sqrtPrice = sqrtPriceX96(price);
    const positionManager = await ethers.getContractAt("NonfungiblePositionManager", nftManager, w);
    //const tx = await positionManager.createAndInitializePoolIfNecessary.staticCall(
    const tx = await positionManager.createAndInitializePoolIfNecessary(
        token0,
        token1,
        500,
        sqrtPrice,
    );
    console.log(tx);
}

async function approveToken(w, tokenAddress, address) {
    const token = await ethers.getContractAt("ERC20", tokenAddress, w);
    await token.approve(address, "0x33b2e3c9fd0803ce8000000");
}

function price2Tick(price) {
    return ((Math.log(price)/Math.log(1.0001)/10).toFixed()) * 10;
}

async function mintLiquidity(w, token0, token1, fee, lowPrice, upPrice, amount0Desired, amount1Desired) {
    const lowTick = price2Tick(lowPrice);
    const upTick = price2Tick(upPrice);
    const scaleAmount0Desired = ethers.parseEther(amount0Desired);
    const scaleAmount1Desired = ethers.parseEther(amount1Desired);
    const positionManager = await ethers.getContractAt("NonfungiblePositionManager", nftManager, w);
    const tx = await positionManager.mint(
        [
            token0,
            token1,
            fee,
            lowTick,
            upTick,
            scaleAmount0Desired,
            scaleAmount1Desired,
            0,
            0,
            w.address,
            1810000000
        ]
    );
    console.log(tx);
}

async function increaseLiquidity(w, tokenId, amount0Desired, amount1Desired) {
    const scaleAmount0Desired = ethers.parseEther(amount0Desired);
    const scaleAmount1Desired = ethers.parseEther(amount1Desired);
    const positionManager = await ethers.getContractAt("NonfungiblePositionManager", nftManager, w);
    const tx = await positionManager.increaseLiquidity(
        [
            1, // tokenId
            scaleAmount0Desired,
            scaleAmount1Desired,
            0,
            0,
            1810000000
        ]
    );
    console.log(tx);
}

async function decreaseLiquidity(w, tokenId, liquidityDesired) {
    const scaleLiquidityDesired = ethers.parseEther(liquidityDesired);
    const positionManager = await ethers.getContractAt("NonfungiblePositionManager", nftManager, w);
    //const position = await positionManager.positions(tokenId);
    //console.log(position);
    const burnAmount = await positionManager.decreaseLiquidity(
        [
            tokenId,
            scaleLiquidityDesired,
            0,
            0,
            1810000000
        ]
    );
    console.log(burnAmount);
}

async function collect(w, amount0, amount1) {
    const scaleAmount0 = ethers.parseEther(amount0);
    const scaleAmount1 = ethers.parseEther(amount1);
    const positionManager = await ethers.getContractAt("NonfungiblePositionManager", nftManager, w);
    const position = await positionManager.positions(1);
    console.log(position);
    await positionManager.collect(
        [
            1,
            w.address,
            scaleAmount0,
            scaleAmount1
        ]
    );
}

async function swapSingle(w, tokenInput, tokenOutput, inputAmount, priceLimit) {
    const scaleInputAmount = ethers.parseEther(inputAmount);
    const sqrtPriceLimit = sqrtPriceX96(priceLimit);
    const quoter = await ethers.getContractAt("QuoterV2", quoterv2, w);
    const swapRouter = await ethers.getContractAt("SwapRouter", router, w);
    const result = await quoter.quoteExactInputSingle.staticCall(
        [
            tokenInput,
            tokenOutput,
            scaleInputAmount,
            500,
            sqrtPriceLimit
        ]
    );
    console.log(result);
    const tx = await swapRouter.exactInputSingle(
        [
            tokenInput,
            tokenOutput,
            500,
            w.address,
            1810000000,
            scaleInputAmount,
            result[0],
            sqrtPriceLimit
        ]
    )
    console.log(tx);
}

async function swap(w, tokens, fees, inputAmount) {
    const path = encodePath(tokens, fees);
    const scaleInputAmount = ethers.parseEther(inputAmount);
    const quoter = await ethers.getContractAt("QuoterV2", quoterv2, w);
    const swapRouter = await ethers.getContractAt("SwapRouter", router, w);
    const amountOut = await quoter.quoteExactInput.staticCall(
        path,
        scaleInputAmount
    );
    console.log(amountOut);
    const tx = await swapRouter.exactInput(
        [
            path,
            w.address,
            1810000000,
            scaleInputAmount,
            amountOut.amountOut
        ]
    );
    console.log(tx);
}

// 2. deploy mapping token factory
async function main() {
    const url = "https://testnet-rpc.bitlayer.org";
    const w = wallet(url);

    // create new pool
    //await createNewPoolAndInitLiquidity(w, usdc, wbtc, 1/70000);

    //await approveToken(w, nftManager);
    //await approveToken(w, brc, nftManager);

    //await mintLiquidity(w, usdc, usdt, 500, 0.9, 1.1, "0.01", "0.01");
    //await mintLiquidity(w, usdc, wbtc, 500, 1/80000, 1/60000, "0.1", "0.0001");

    //await increaseLiquidity(w, 1, "0.1", "0.1");
    //await decreaseLiquidity(w, 1, "0.01");
    //await collect(w, "0.0001", "0.0001");
    //await swapSingle(w, usdc, usdt, "0.01", "0.9");
    await swap(w, [usdt, usdc, wbtc], [500, 500], "0.001");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

