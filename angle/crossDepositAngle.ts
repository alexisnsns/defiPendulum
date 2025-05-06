import { ethers } from "ethers";

import dotenv from "dotenv";
dotenv.config();

import {
  USDC_DECIMALS,
  CHAIN_IDS,
  USDC_ADDRESSES,
  SPOKEPOOL_ADDRESSES,
} from "../utils/resources.js";

import {
  buildAngleAccrossCallData,
  approveUSDCSpending,
  buildFinalTxObject,
  generateSingleChainDepositCallDataAngle,
  generateMintUSDACallDataAngle,
} from "../utils/utils.js";

import { providers, wallets } from "../utils/ethersUtils.js";

////////////////////////////////////////////////////////////

export async function depositAngleCrossChain(
  amountToDeposit: string,
  inputChain: string,
  outputChain: string
) {
  const _INPUT_TOKEN_ADDRESS = USDC_ADDRESSES[inputChain.toUpperCase()];
  const _CHAIN_ID = CHAIN_IDS[inputChain.toUpperCase()];

  const OUTPUT_TOKEN_ADDRESS = USDC_ADDRESSES[outputChain.toUpperCase()];
  const OUTPUT_CHAIN_ID = CHAIN_IDS[outputChain.toUpperCase()];

  const _SIGNER = wallets[inputChain.toUpperCase()];
  const _PROVIDER = providers[inputChain.toUpperCase()];

  const _POOL_ADDRESS = "0xC0077E921C30c39cDD8b693E25Af572C10E82a05";

  const stUSD = "0x0022228a2cc5E7eF0274A7Baa600d44da5aB5776";
  const angleRouter = "0x9A33e690AA78A4c346e72f7A5e16e5d7278BE835";

  const arbTransmiter = "0xD253b62108d1831aEd298Fc2434A5A8e4E418053";
  const USDA = "0x0000206329b97DB379d5E1Bf586BbDB969C63274";
  const SPENDER_ADDRESS = SPOKEPOOL_ADDRESSES[inputChain.toUpperCase()];


  try {
    const depositAmount = ethers.parseUnits(amountToDeposit, USDC_DECIMALS);

    const minOut = (Number(amountToDeposit) * 0.9).toString();
    const _minAmount = ethers.parseUnits(minOut, 18);

    // 1/ Approve USDC to be spent by ACCROSS Contract
    await approveUSDCSpending(
      depositAmount,
      _INPUT_TOKEN_ADDRESS,
      // Address to approve
      SPENDER_ADDRESS,
      _SIGNER,
      _PROVIDER
    );

    const finalCallData = await buildAngleAccrossCallData(
      depositAmount,
      _minAmount,
      _INPUT_TOKEN_ADDRESS,
      _CHAIN_ID,
      OUTPUT_TOKEN_ADDRESS,
      OUTPUT_CHAIN_ID,
      arbTransmiter
    );

    const txObject = await buildFinalTxObject(
      finalCallData,
      _CHAIN_ID,
      SPENDER_ADDRESS,
      _PROVIDER
    );

    console.log("Sending final transaction...");
    const depositTx = await _SIGNER.sendTransaction(txObject);

    await depositTx.wait();
    console.log(
      "Cross Chain Deposit transaction receipt received.",
      depositTx.hash
    );
    console.log(
      "Cross tx:",
      Number(amountToDeposit).toFixed(2),
      "USDC on",
      inputChain
    );
  } catch (error) {
    console.error("Error in single chain deposit process:", error);
  }
}

depositAngleCrossChain("1", "BASE", "ARBITRUM");
