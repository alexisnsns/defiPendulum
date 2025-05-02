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

export async function getUserFluidPositions() {
  const accountPromises = CHAINS_FLUID_MORPHO.map(async (chain: string) => {
    const contract = new ethers.Contract(
      FLUID_MORPHO_POOL_ADDRESSES[chain + "_"],
      ERC20_ABI,
      providers[chain]
    );

    const rawBalance = await contract.balanceOf(userAddress);
    return {
      chain,
      ID: null,
      balance: ethers.formatUnits(rawBalance, 6),
    };
  });

  const results = await Promise.all(accountPromises);

  const filtered = results.filter(({ balance }) => balance !== "0.0");

  // console.log(filtered);
  return filtered;
}

// getUserFluidPositions();
