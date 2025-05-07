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

  // if not ARB, then Base
  const angleTransmutter =
    outputChain === "ARBITRUM"
      ? "0xD253b62108d1831aEd298Fc2434A5A8e4E418053"
      : "0x222222880e079445Df703c0604706E71a538Fd4f";

  const SPENDER_ADDRESS = SPOKEPOOL_ADDRESSES[inputChain.toUpperCase()];

  try {
    const depositAmount = ethers.parseUnits(amountToDeposit, USDC_DECIMALS);

    // 1/ Approve USDC to be spent by ACCROSS Contract
    await approveUSDCSpending(
      depositAmount,
      _INPUT_TOKEN_ADDRESS,
      // Address to approve
      SPENDER_ADDRESS,
      _SIGNER
    );

    const finalCallData = await buildAngleAccrossCallData(
      depositAmount,
      _INPUT_TOKEN_ADDRESS,
      _CHAIN_ID,
      OUTPUT_TOKEN_ADDRESS,
      OUTPUT_CHAIN_ID,
      angleTransmutter
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
    console.error("Error in cross chain deposit process:", error);
  }
}

depositAngleCrossChain("1", "ARBITRUM", "BASE");
