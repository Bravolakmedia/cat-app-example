import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomiclabs/hardhat-ethers";

import * as dotenv from "dotenv";
dotenv.config();


const config: HardhatUserConfig = {
  solidity: "0.8.18",
  networks: {
    fractal: {
      url: "https://fractal-mainnet.rpc.url",
      accounts: [`0x${process.env.WALLET_PRIVATE_KEY}`],
    },
  },
};

export default config;
