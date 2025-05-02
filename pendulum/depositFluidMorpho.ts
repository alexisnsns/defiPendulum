import { ethers } from "ethers";

import dotenv from "dotenv";
dotenv.config();

import {
  USDC_DECIMALS,
  FLUID_MORPHO_POOL_ADDRESSES,
  CHAIN_IDS,
  USDC_ADDRESSES,
  SPOKEPOOL_ADDRESSES,
} from "../utils/resources.js";

import {
  buildAccrossCallData,
  approveUSDCSpending,
  buildFinalTxObject,
  generateSingleChainDepositCallDataFluid,
} from "../utils/utils.js";

import { providers, wallets } from "../utils/ethersUtils.js";
import { getUserNativeUSDValuesSingleChain } from "./utils/gasCheck.js";

////////////////////////////////////////////////////////////

export async function depositUSDCToFluidMorphoCrossChain(
  amountToDeposit: string,
  inputChain: string,
  outputChain: string,
  ID?: string
) {
  const gasValue = await getUserNativeUSDValuesSingleChain(inputChain);
  if (gasValue < 0.1) {
    console.log(
      `Not enough gas to initiate cross-chain tx; only ${gasValue.toFixed(
        2
      )} USD available on ${inputChain}; abort transaction`
    );
    return;
  }
  // console.log("---start cross chain deposit-----");
  // console.log("amount to deposit:", amountToDeposit);
  // console.log("FROM:", inputChain);
  // console.log("TO:", outputChain);
  // console.log("--------");

  // INPUT CHAIN
  const INPUT_CHAIN_ID = CHAIN_IDS[inputChain.toUpperCase()];
  const INPUT_TOKEN_ADDRESS = USDC_ADDRESSES[inputChain.toUpperCase()];
  const SIGNER = wallets[inputChain.toUpperCase()];
  const PROVIDER = providers[inputChain.toUpperCase()];
  const SPENDER_ADDRESS = SPOKEPOOL_ADDRESSES[inputChain.toUpperCase()];

  // console.log("INPUT_CHAIN_ID", INPUT_CHAIN_ID);
  // console.log("INPUT_TOKEN_ADDRESS", INPUT_TOKEN_ADDRESS);

  // OUTPUT CHAIN
  const OUTPUT_TOKEN_ADDRESS = USDC_ADDRESSES[outputChain.toUpperCase()];
  const OUTPUT_CHAIN_ID = CHAIN_IDS[outputChain.toUpperCase()];

  const suffix = ID ? `_${ID}` : "_";
  const OUTPUT_POOL_ADDRESS =
    FLUID_MORPHO_POOL_ADDRESSES[outputChain.toUpperCase() + suffix];

  // console.log("OUTPUT_TOKEN_ADDRESS", OUTPUT_TOKEN_ADDRESS);
  // console.log("OUTPUT_CHAIN_ID", OUTPUT_CHAIN_ID);

  // console.log("OUTPUT_POOL_ADDRESS", OUTPUT_POOL_ADDRESS);
  // console.log("SPENDER_ADDRESS", SPENDER_ADDRESS);

  try {
    const depositAmount = ethers.parseUnits(amountToDeposit, USDC_DECIMALS);

    // Approve Across spender address
    await approveUSDCSpending(
      depositAmount,
      INPUT_TOKEN_ADDRESS,
      SPENDER_ADDRESS,
      SIGNER,
      PROVIDER
    );

    const finalCallData = await buildAccrossCallData(
      depositAmount,
      INPUT_TOKEN_ADDRESS,
      INPUT_CHAIN_ID,
      OUTPUT_TOKEN_ADDRESS,
      OUTPUT_CHAIN_ID,
      OUTPUT_POOL_ADDRESS
    );

    // Create transaction with the final data
    const txObject = await buildFinalTxObject(
      finalCallData,
      INPUT_CHAIN_ID,
      SPENDER_ADDRESS,
      PROVIDER
    );
    // console.log("Sending transaction...");
    const depositTx = await SIGNER.sendTransaction(txObject);
    await depositTx.wait();
    console.log(
      "CrossChain tx:",
      Number(amountToDeposit).toFixed(2),
      "USDC from",
      inputChain,
      "to",
      outputChain
    );
  } catch (error) {
    console.error("Error in cross chain deposit process:", error);
  }
}

export async function depositUSDCToFluidMorphoSingleChain(
  amountToDeposit: string,
  chainName: string,
  ID?: string
) {
  const gasValue = await getUserNativeUSDValuesSingleChain(chainName);
  if (gasValue < 0.01) {
    console.log(gasValue);
    console.log(
      `Not enough gas to initiate tx; only ${gasValue.toFixed(
        2
      )} USD available on ${chainName}; abort transaction`
    );
    return;
  }
  const _INPUT_TOKEN_ADDRESS = USDC_ADDRESSES[chainName.toUpperCase()];
  const _CHAIN_ID = CHAIN_IDS[chainName.toUpperCase()];

  const _SIGNER = wallets[chainName.toUpperCase()];
  const _PROVIDER = providers[chainName.toUpperCase()];

  const suffix = ID ? `_${ID}` : "_";
  const _POOL_ADDRESS =
    FLUID_MORPHO_POOL_ADDRESSES[chainName.toUpperCase() + suffix];

  try {
    const depositAmount = ethers.parseUnits(amountToDeposit, USDC_DECIMALS);

    // Approve Across spender address
    await approveUSDCSpending(
      depositAmount,
      _INPUT_TOKEN_ADDRESS,
      // FLUID POOL ADDRESS
      _POOL_ADDRESS,
      _SIGNER,
      _PROVIDER
    );

    const finalCallData = await generateSingleChainDepositCallDataFluid(
      depositAmount
    );

    // Create transaction with the final data
    const txObject = await buildFinalTxObject(
      finalCallData,
      _CHAIN_ID,
      // Fluid POOL ADDRESS
      _POOL_ADDRESS,
      _PROVIDER
    );

    // console.log("Sending transaction...");
    const depositTx = await _SIGNER.sendTransaction(txObject);
    await depositTx.wait();
    // console.log("Single Chain Deposit transaction receipt received.");
    console.log(
      "SingleChain tx:",
      Number(amountToDeposit).toFixed(2),
      "USDC on",
      chainName
    );
  } catch (error) {
    console.error("Error in single chain deposit process:", error);
  }
}

// depositUSDCToFluidMorphoCrossChain("2", "POLYGON", "ARBITRUM");
// depositUSDCToFluidMorphoSingleChain("0.3", "OPTIMISM");
