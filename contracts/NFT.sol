// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NFT is ERC721 {
    uint256 public lastTokenId;

    constructor() ERC721("Advanced NFT", "NFT") {}

    /**
     * @dev create new NFT item
     */

    function createNew() external {
        _safeMint(msg.sender, lastTokenId);
        lastTokenId = lastTokenId + 1;
    }

    function _baseURI() internal pure override returns (string memory) {
        return "https://advancedblockchain.com/nfts/";
    }
}
