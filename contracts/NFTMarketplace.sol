// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @dev NFT marketplace where sellers can list, and buys can purchase with fixed price
 * @author Ryuhei Matsuda
 */

contract NFTMarketplace is Ownable, ERC721Holder {
    using SafeERC20 for IERC20;

    event NewItemListed(
        address indexed nft,
        uint256 indexed tokenId,
        address indexed seller,
        uint256 price
    );
    event Unlisted(address indexed nft, uint256 indexed tokenId);
    event ItemSold(
        address indexed nft,
        uint256 indexed tokenId,
        address indexed buyer
    );

    event TreasuryUpdated(address treasury);
    event FeeRateUpdated(uint256 feeRate);

    uint256 constant DENOMINATOR = 10000;

    // Team treasury address to receive purchase fee
    address public treasury;
    // fee rate of payment
    uint256 public feeRate;
    // payment token used to purchase NFT
    address public immutable paymentToken;
    // seller address of NFT item
    mapping(address => mapping(uint256 => address)) public sellers;
    // price of NFT item
    mapping(address => mapping(uint256 => uint256)) public prices;

    constructor(
        address _treasury,
        uint256 _feeRate,
        address _paymentToken
    ) {
        require(_treasury != address(0), "treasury cannot be zero");
        require(
            _feeRate <= DENOMINATOR,
            "fee rate can not be greater than 100%"
        );
        require(_paymentToken != address(0), "payment token cannot be zero");
        treasury = _treasury;
        feeRate = _feeRate;
        paymentToken = _paymentToken;
    }

    /**
     * @dev list NFT for sale
     * @param _nft address of NFT
     * @param _tokenId tokenID of nft
     * @param _price fixed price of NFT
     */

    function listForSale(
        address _nft,
        uint256 _tokenId,
        uint256 _price
    ) external {
        require(_nft != address(0), "nft token cannot be zero");
        require(_price > 0, "price cannot be zero");
        IERC721(_nft).safeTransferFrom(msg.sender, address(this), _tokenId, "");
        sellers[_nft][_tokenId] = msg.sender;
        prices[_nft][_tokenId] = _price;

        emit NewItemListed(_nft, _tokenId, msg.sender, _price);
    }

    /**
     * @dev unlist NFT from sale
     * @param _nft address of NFT
     * @param _tokenId tokenID of nft
     */

    function unlistForSale(address _nft, uint256 _tokenId) external {
        require(prices[_nft][_tokenId] > 0, "Item not listed");
        require(sellers[_nft][_tokenId] == msg.sender, "Not seller");

        IERC721(_nft).safeTransferFrom(address(this), msg.sender, _tokenId, "");
        sellers[_nft][_tokenId] = address(0);
        prices[_nft][_tokenId] = 0;

        emit Unlisted(_nft, _tokenId);
    }

    /**
     * @dev purchase NFT
     * @param _nft address of NFT
     * @param _tokenId tokenID of nft
     */

    function purchase(address _nft, uint256 _tokenId) external {
        require(
            sellers[_nft][_tokenId] != address(0) && prices[_nft][_tokenId] > 0,
            "Item not listed"
        );
        require(
            sellers[_nft][_tokenId] != msg.sender,
            "Seller cannot purchase"
        );

        uint256 price = prices[_nft][_tokenId];
        uint256 fee = (price * feeRate) / DENOMINATOR;
        IERC20(paymentToken).safeTransferFrom(
            msg.sender,
            sellers[_nft][_tokenId],
            price - fee
        );
        if (fee > 0) {
            IERC20(paymentToken).safeTransferFrom(msg.sender, treasury, fee);
        }

        IERC721(_nft).safeTransferFrom(address(this), msg.sender, _tokenId, "");
        sellers[_nft][_tokenId] = address(0);
        prices[_nft][_tokenId] = 0;

        emit ItemSold(_nft, _tokenId, msg.sender);
    }

    /**
     * @dev update treasury address
     * @param _treasury address of new treasury
     */

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "treasury cannot be zero");
        treasury = _treasury;

        emit TreasuryUpdated(treasury);
    }

    /**
     * @dev update fee rate
     * @param _feeRate new fee rate
     */

    function setFeeRate(uint256 _feeRate) external onlyOwner {
        require(
            _feeRate <= DENOMINATOR,
            "fee rate can not be greater than 100%"
        );
        feeRate = _feeRate;

        emit FeeRateUpdated(feeRate);
    }
}
