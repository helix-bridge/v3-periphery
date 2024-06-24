// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity =0.7.6;

import './interfaces/INonfungiblePositionManager.sol';
import './interfaces/INonfungibleTokenPositionDescriptor.sol';
import '@uniswap/v3-core/contracts/UniswapV3Pool.sol';

//import "hardhat/console.sol";

/// @title Describes NFT token positions
/// @notice Produces a string containing the data URI for a JSON metadata string
contract NonfungibleTokenPositionDescriptor is INonfungibleTokenPositionDescriptor {
    address public immutable WETH9;

    constructor(address _WETH9) {
        WETH9 = _WETH9;

        //bytes32 INIT_CODE_HASH = keccak256(abi.encodePacked(type(UniswapV3Pool).creationCode));
        //console.log(uint256(INIT_CODE_HASH));
    }

    /// @inheritdoc INonfungibleTokenPositionDescriptor
    function tokenURI(INonfungiblePositionManager positionManager, uint256 tokenId)
        external
        view
        override
        returns (string memory)
    {
        return "";
    }
}
