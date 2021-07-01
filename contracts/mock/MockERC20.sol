// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20("MockERC20", "MOCK") {
    constructor(uint256 _totalSupply) {
        _mint(msg.sender, _totalSupply);
    }
}
