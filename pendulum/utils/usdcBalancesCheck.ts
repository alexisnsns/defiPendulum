import { ethers } from "ethers";

import {
  USDC_DECIMALS,
  POOL_ADDRESSES,
  USDC_ADDRESSES,
  ERC20_ABI,
  FLUID_MORPHO_POOL_ADDRESSES,
  CHAINS_FLUID_MORPHO,
} from "../../utils/resources.js";

import { wallets, providers } from "../../utils/ethersUtils.js";

const CHAINNAME = "POLYGON";
const userAddress = await wallets[CHAINNAME].getAddress();
export async function getUserUSDCBalance() {
  try {
    const balancePromises = CHAINS_FLUID_MORPHO.map(async (chain: string) => {
      const contractAddress = USDC_ADDRESSES[chain];
      if (!contractAddress) {
        throw new Error(`No contract address for ${chain}`);
      }

      const contract = new ethers.Contract(
        contractAddress,
        ERC20_ABI,
        providers[chain]
      );

      const [rawBalance] = await Promise.all([contract.balanceOf(userAddress)]);

      return {
        chain,
        balance: ethers.formatUnits(rawBalance, USDC_DECIMALS),
      };
    });

    const results = await Promise.all(balancePromises);

    const balancesByChain = Object.fromEntries(
      results
        .filter(({ balance }) => balance !== "0.0")
        .map(({ chain, balance }) => [chain.toUpperCase(), balance])
    );

    // console.log("current usdc balances", balancesByChain);
    return balancesByChain;
  } catch (error) {
    console.error("Error getting USDC balance:", error);
    throw error; // rethrow the error if you want it to propagate up
  }
}
// getUserUSDCBalance();
