require('@nomiclabs/hardhat-waffle');
require('solidity-coverage');

module.exports = {
  networks: {
    hardhat: {
      gas: 10000000,
      accounts: {
        accountsBalance: '100000000000000000000000000',
      },
      allowUnlimitedContractSize: true,
      timeout: 1000000,
    },
  },
  solidity: {
    version: '0.8.3',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
};
