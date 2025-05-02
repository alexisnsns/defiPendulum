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

export async function getUserMorphoPositions() {
  const morphoKeys = ["1", "2", "3"];

  const accountPromises = morphoKeys.map(async (key) => {
    const provider = providers["BASE"]; // all morpho pools are on Base
    const contract = new ethers.Contract(
      FLUID_MORPHO_POOL_ADDRESSES["BASE_" + key],
      ERC20_ABI,
      provider
    );

    const rawBalance = await contract.balanceOf(userAddress);
    const rawAssets = await contract.convertToAssets(rawBalance);

    return {
      chain: "BASE",
      ID: key,
      balance: ethers.formatUnits(rawAssets, USDC_DECIMALS),
    };
  });

  const results = await Promise.all(accountPromises);

  const filtered = results.filter(({ balance }) => balance !== "0.0");
  // console.log(filtered);

  return filtered;
}

// getUserMorphoPositions();
