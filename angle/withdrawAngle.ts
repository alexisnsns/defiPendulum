import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config();

import {
  USDC_ADDRESSES,
  USDC_DECIMALS,
  FLUID_MORPHO_POOL_ADDRESSES,
  CHAIN_IDS,
} from "../utils/resources.js";

import {
  buildFinalTxObject,
  generateWithdrawCallDataFluid,
} from "../utils/utils.js";

import { providers, wallets } from "../utils/ethersUtils.js";

////////////////////////////////////////////////////////////

export async function withdrawFromAngle(
  amountToWithdraw: string,
  chainName: string,
) {
  const _CHAIN_ID = CHAIN_IDS[chainName.toUpperCase()];

  const _SIGNER = wallets[chainName.toUpperCase()];
  const _PROVIDER = providers[chainName.toUpperCase()];

  const stUSD = "0x0022228a2cc5E7eF0274A7Baa600d44da5aB5776";

  try {
    const withdrawAmount = ethers.parseUnits(amountToWithdraw, 18);

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
      stUSD,
      _PROVIDER
    );

    console.log("Sending withdraw transaction...");

    const withdrawTx = await _SIGNER.sendTransaction(txObject);
    await withdrawTx.wait();
    console.log("Withdrew", amountToWithdraw, "USDC from", chainName);
  } catch (error) {
    console.error("Error in withdraw process:", error);
  }
}

withdrawFromAngle('1', "BASE");
