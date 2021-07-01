const { ethers } = require('hardhat');
const { expect } = require('chai');
const { BigNumber } = require('ethers');
const { constants } = require('@openzeppelin/test-helpers');

describe('NFTMarketplace', () => {
  let owner;
  let alice;
  let bob;
  let carol;
  let treasury;
  let nft;
  let marketplace;
  let paymentToken;
  let feeRate = BigNumber.from('100'); // 1%
  const DENOMINATOR = BigNumber.from('10000');

  beforeEach(async () => {
    const accounts = await ethers.getSigners();
    [owner, alice, bob, carol, treasury] = accounts;
    const NFT = await ethers.getContractFactory('NFT');
    nft = await NFT.deploy();
    const MockERC20 = await ethers.getContractFactory('MockERC20');
    paymentToken = await MockERC20.deploy('100000000000000000000000000');
    const NFTMarketplace = await ethers.getContractFactory('NFTMarketplace');
    marketplace = await NFTMarketplace.deploy(
      treasury.address,
      feeRate,
      paymentToken.address,
    );
  });

  describe('constructor', () => {
    it('Revert if treasury is zero', async () => {
      const NFTMarketplace = await ethers.getContractFactory('NFTMarketplace');
      await expect(
        NFTMarketplace.deploy(
          constants.ZERO_ADDRESS,
          feeRate,
          paymentToken.address,
        ),
      ).to.be.revertedWith('treasury cannot be zero');
    });

    it('Revert if fee rate is greater than 100%', async () => {
      const NFTMarketplace = await ethers.getContractFactory('NFTMarketplace');
      await expect(
        NFTMarketplace.deploy(
          treasury.address,
          DENOMINATOR.add(BigNumber.from('1')),
          paymentToken.address,
        ),
      ).to.be.revertedWith('fee rate can not be greater than 100%');
    });

    it('Revert if payment token is zero', async () => {
      const NFTMarketplace = await ethers.getContractFactory('NFTMarketplace');
      await expect(
        NFTMarketplace.deploy(
          treasury.address,
          feeRate,
          constants.ZERO_ADDRESS,
        ),
      ).to.be.revertedWith('payment token cannot be zero');
    });
  });

  describe('Check token metadata', () => {
    it('Check treasury', async () => {
      expect(await marketplace.treasury()).to.equal(treasury.address);
    });

    it('Check fee rate', async () => {
      expect(await marketplace.feeRate()).to.equal(feeRate);
    });

    it('Check payment token', async () => {
      expect(await marketplace.paymentToken()).to.equal(paymentToken.address);
    });

    it('Check owner', async () => {
      expect(await marketplace.owner()).to.equal(owner.address);
    });
  });

  describe('setFeeRate', () => {
    const newFeeRate = BigNumber.from('10');

    it('Revert if msg.sender is not owner', async () => {
      await expect(
        marketplace.connect(alice).setFeeRate(newFeeRate),
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('Revert if fee rate is greater than 100%', async () => {
      await expect(
        marketplace
          .connect(owner)
          .setFeeRate(DENOMINATOR.add(BigNumber.from('1'))),
      ).to.be.revertedWith('fee rate can not be greater than 100%');
    });

    it('Set transfer fee rate and emit TransferFeeRateUpdated event', async () => {
      const tx = await marketplace.connect(owner).setFeeRate(newFeeRate);
      expect(await marketplace.feeRate()).to.equal(newFeeRate);
      expect(tx).to.emit(marketplace, 'FeeRateUpdated').withArgs(newFeeRate);
    });
  });

  describe('setTreasury', () => {
    it('Revert if msg.sender is not owner', async () => {
      await expect(
        marketplace.connect(alice).setTreasury(bob.address),
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('Revert if treasury is zero', async () => {
      await expect(
        marketplace.connect(owner).setTreasury(constants.ZERO_ADDRESS),
      ).to.be.revertedWith('treasury cannot be zero');
    });

    it('Set treasury and emit TreasuryUpdated event', async () => {
      const tx = await marketplace.connect(owner).setTreasury(bob.address);
      expect(await marketplace.treasury()).to.equal(bob.address);
      expect(tx).to.emit(marketplace, 'TreasuryUpdated').withArgs(bob.address);
    });
  });

  describe('listForSale', () => {
    it('Revert if nft is zero', async () => {
      await expect(
        marketplace.connect(alice).listForSale(constants.ZERO_ADDRESS, 0, 100),
      ).to.be.revertedWith('nft token cannot be zero');
    });

    it('Revert if price is zero', async () => {
      await expect(
        marketplace.connect(alice).listForSale(nft.address, 0, 0),
      ).to.be.revertedWith('price cannot be zero');
    });

    it('Revert if nft is not exist', async () => {
      const tokenId = 0;
      const price = ethers.utils.parseUnits('100', 18);

      await expect(
        marketplace.connect(alice).listForSale(nft.address, tokenId, price),
      ).to.be.revertedWith('ERC721: operator query for nonexistent token');
    });

    it('List NFT for sale and emit NewItemListed events', async () => {
      await nft.connect(alice).createNew();
      const tokenId = 0;
      await nft.connect(alice).approve(marketplace.address, tokenId);
      const price = ethers.utils.parseUnits('100', 18);
      const tx = await marketplace
        .connect(alice)
        .listForSale(nft.address, tokenId, price);

      expect(await marketplace.sellers(nft.address, tokenId)).to.equal(
        alice.address,
      );
      expect(await marketplace.prices(nft.address, tokenId)).to.equal(price);
      expect(tx)
        .to.emit(marketplace, 'NewItemListed')
        .withArgs(nft.address, tokenId, alice.address, price);
    });
  });

  describe('unlistForSale', () => {
    it('Revert if item not listed', async () => {
      await expect(
        marketplace.connect(alice).unlistForSale(nft.address, 0),
      ).to.be.revertedWith('Item not listed');
    });

    it('Revert if msg.sender is not seller', async () => {
      await nft.connect(alice).createNew();
      const tokenId = 0;
      await nft.connect(alice).approve(marketplace.address, tokenId);
      const price = ethers.utils.parseUnits('100', 18);
      await marketplace.connect(alice).listForSale(nft.address, tokenId, price);

      await expect(
        marketplace.connect(bob).unlistForSale(nft.address, tokenId),
      ).to.be.revertedWith('Not seller');
    });

    it('Unlist NFT for sale and emit Unlisted events', async () => {
      await nft.connect(alice).createNew();
      const tokenId = 0;
      await nft.connect(alice).approve(marketplace.address, tokenId);
      const price = ethers.utils.parseUnits('100', 18);
      await marketplace.connect(alice).listForSale(nft.address, tokenId, price);

      const tx = await marketplace
        .connect(alice)
        .unlistForSale(nft.address, tokenId);

      expect(await marketplace.sellers(nft.address, tokenId)).to.equal(
        constants.ZERO_ADDRESS,
      );
      expect(await marketplace.prices(nft.address, tokenId)).to.equal(0);
      expect(tx)
        .to.emit(marketplace, 'Unlisted')
        .withArgs(nft.address, tokenId);
    });
  });

  describe('purchase', () => {
    it('Revert if item not listed', async () => {
      await expect(
        marketplace.connect(alice).purchase(nft.address, 0),
      ).to.be.revertedWith('Item not listed');
    });

    it('Revert if msg.sender is seller', async () => {
      await nft.connect(alice).createNew();
      const tokenId = 0;
      await nft.connect(alice).approve(marketplace.address, tokenId);
      const price = ethers.utils.parseUnits('100', 18);
      await marketplace.connect(alice).listForSale(nft.address, tokenId, price);

      await expect(
        marketplace.connect(alice).purchase(nft.address, tokenId),
      ).to.be.revertedWith('Seller cannot purchase');
    });

    it('Purchase NFT and emit ItemSold event', async () => {
      await nft.connect(alice).createNew();
      const tokenId = 0;
      await nft.connect(alice).approve(marketplace.address, tokenId);
      const price = ethers.utils.parseUnits('100', 18);
      await marketplace.connect(alice).listForSale(nft.address, tokenId, price);

      await paymentToken.transfer(bob.address, price);
      await paymentToken.connect(bob).approve(marketplace.address, price);

      const tx = await marketplace.connect(bob).purchase(nft.address, tokenId);

      expect(await marketplace.sellers(nft.address, tokenId)).to.equal(
        constants.ZERO_ADDRESS,
      );
      expect(await marketplace.prices(nft.address, tokenId)).to.equal(0);
      expect(tx)
        .to.emit(marketplace, 'ItemSold')
        .withArgs(nft.address, tokenId, bob.address);

      expect(await paymentToken.balanceOf(bob.address)).to.equal(0);
      expect(await paymentToken.balanceOf(treasury.address)).to.equal(
        price.mul(feeRate).div(DENOMINATOR),
      );
      expect(await paymentToken.balanceOf(alice.address)).to.equal(
        price.sub(price.mul(feeRate).div(DENOMINATOR)),
      );
    });

    it('Do not send fee if fee rate is zero', async () => {
      await nft.connect(alice).createNew();
      const tokenId = 0;
      await nft.connect(alice).approve(marketplace.address, tokenId);
      const price = ethers.utils.parseUnits('100', 18);
      await marketplace.connect(alice).listForSale(nft.address, tokenId, price);

      await paymentToken.transfer(bob.address, price);
      await paymentToken.connect(bob).approve(marketplace.address, price);

      await marketplace.setFeeRate(0);
      const tx = await marketplace.connect(bob).purchase(nft.address, tokenId);

      expect(await marketplace.sellers(nft.address, tokenId)).to.equal(
        constants.ZERO_ADDRESS,
      );
      expect(await marketplace.prices(nft.address, tokenId)).to.equal(0);
      expect(tx)
        .to.emit(marketplace, 'ItemSold')
        .withArgs(nft.address, tokenId, bob.address);

      expect(await paymentToken.balanceOf(bob.address)).to.equal(0);
      expect(await paymentToken.balanceOf(treasury.address)).to.equal(0);
      expect(await paymentToken.balanceOf(alice.address)).to.equal(price);
    });
  });
});
