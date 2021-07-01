const { ethers } = require('hardhat');
const { expect } = require('chai');

describe('NFT', () => {
  let alice;
  let nft;
  const NAME = 'Advanced NFT';
  const SYMBOL = 'NFT';
  const baseURI = 'https://advancedblockchain.com/nfts/';

  beforeEach(async () => {
    const accounts = await ethers.getSigners();
    [alice] = accounts;
    const NFT = await ethers.getContractFactory('NFT');
    nft = await NFT.deploy();
  });

  describe('Check token metadata', () => {
    it('Check name', async () => {
      expect(await nft.name()).to.equal(NAME);
    });

    it('Check symbol', async () => {
      expect(await nft.symbol()).to.equal(SYMBOL);
    });

    it('Check last token id', async () => {
      expect(await nft.lastTokenId()).to.equal(0);
    });
  });

  describe('createNew', () => {
    it('Mint NFT', async () => {
      await nft.connect(alice).createNew();
      expect(await nft.ownerOf(0)).to.equal(alice.address);
      expect(await nft.balanceOf(alice.address)).to.equal(1);
      expect(await nft.lastTokenId()).to.equal(1);

      expect(await nft.tokenURI(0)).to.equal(baseURI + 0);
    });
  });
});
