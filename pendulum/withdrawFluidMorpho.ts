import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config();

import {
  USDC_ADDRESSES,
  USDC_DECIMALS,
  FLUID_MORPHO_POOL_ADDRESSES,
  CHAIN_IDS,
} from "../utils/resources.js";
import { getUserNativeUSDValuesSingleChain } from "./utils/gasCheck.js";

import {
  buildFinalTxObject,
  generateWithdrawCallDataFluid,
} from "../utils/utils.js";

import { providers, wallets } from "../utils/ethersUtils.js";

////////////////////////////////////////////////////////////

export async function withdrawUSDCFromFluidMorpho(
  amountToWithdraw: string,
  chainName: string,
  ID?: string
) {
  const _CHAIN_ID = CHAIN_IDS[chainName.toUpperCase()];

  const _SIGNER = wallets[chainName.toUpperCase()];
  const _PROVIDER = providers[chainName.toUpperCase()];
  const suffix = ID ? `_${ID}` : "_"; // fallback to just underscore if no ID

  const _POOL_ADDRESS =
    FLUID_MORPHO_POOL_ADDRESSES[chainName.toUpperCase() + suffix];

  const gasValue = await getUserNativeUSDValuesSingleChain(chainName);
  if (gasValue < 0.1) {
    console.log(
      `Not enough gas to initiate withdraw tx; only ${gasValue.toFixed(
        2
      )} USD available on ${chainName}; abort transaction`
    );
    return;
  }

  try {
    const withdrawAmount = ethers.parseUnits(amountToWithdraw, USDC_DECIMALS);

    // console.log(withdrawAmount);
    // console.log(_POOL_ADDRESS);
    // console.log(_CHAIN_ID);
    // console.log('provider:', _PROVIDER);
    // console.log('chainname:', chainName);

    // Generate initial message for fee estimation
    const callData = await generateWithdrawCallDataFluid(withdrawAmount);

    // console.log("Generated CallData:", callData);

    const txObject = await buildFinalTxObject(
      callData,
      _CHAIN_ID,
      _POOL_ADDRESS,
      _PROVIDER
    );

    // console.log("Sending withdraw transaction...");

    const withdrawTx = await _SIGNER.sendTransaction(txObject);
    await withdrawTx.wait();
    console.log("Withdrew", amountToWithdraw, "USDC from", chainName);
  } catch (error) {
    console.error("Error in withdraw process:", error);
  }
}

// const amount = ethers.formatUnits("6586337", USDC_DECIMALS);
// withdrawUSDCFromFluid(amount, "POLYGON");
