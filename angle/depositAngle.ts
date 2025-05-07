import { ethers } from "ethers";

import dotenv from "dotenv";
dotenv.config();

import {
  USDC_DECIMALS,
  CHAIN_IDS,
  USDC_ADDRESSES,
} from "../utils/resources.js";

import {
  buildAccrossCallData,
  approveUSDCSpending,
  buildFinalTxObject,
  generateSingleChainDepositCallDataAngle,
  generateMintUSDACallDataAngle,
} from "../utils/utils.js";

import { providers, wallets } from "../utils/ethersUtils.js";

////////////////////////////////////////////////////////////

export async function depositAngle(amountToDeposit: string, chainName: string) {
  const _INPUT_TOKEN_ADDRESS = USDC_ADDRESSES[chainName.toUpperCase()];
  const _CHAIN_ID = CHAIN_IDS[chainName.toUpperCase()];

  const _SIGNER = wallets[chainName.toUpperCase()];
  const _PROVIDER = providers[chainName.toUpperCase()];

  const stUSD = "0x0022228a2cc5E7eF0274A7Baa600d44da5aB5776";

  // if not ARB, then Base
  const angleTransmutter =
    chainName === "ARBITRUM"
      ? "0xD253b62108d1831aEd298Fc2434A5A8e4E418053"
      : "0x222222880e079445Df703c0604706E71a538Fd4f";

  const USDA = "0x0000206329b97DB379d5E1Bf586BbDB969C63274";

  try {
    const depositAmount = ethers.parseUnits(amountToDeposit, USDC_DECIMALS);

    // 1/ Approve USDC to be spent by transmitter Contract
    await approveUSDCSpending(
      depositAmount,
      _INPUT_TOKEN_ADDRESS,
      // Address to approve
      angleTransmutter,
      _SIGNER
    );

    // 2/ Mint USDC<>USDA on the transmitter contract
    const _depositAmount = ethers.parseUnits(amountToDeposit, 18);

    const callData = await generateMintUSDACallDataAngle(
      depositAmount,
      _depositAmount,
      _INPUT_TOKEN_ADDRESS,
      USDA
    );

    const mintTxObject = await buildFinalTxObject(
      callData,
      _CHAIN_ID,
      angleTransmutter,
      _PROVIDER
    );

    console.log("Sending mint transaction...");
    const mintTx = await _SIGNER.sendTransaction(mintTxObject);
    await mintTx.wait();
    console.log("Mint transaction receipt received.");

    // 3/ Approve USDA spending by the stUSD contract
    await approveUSDCSpending(_depositAmount, USDA, stUSD, _SIGNER);

    // 4/ Mint USDA<>stUSD on the stUSD contract
    const finalCallData = await generateSingleChainDepositCallDataAngle(
      _depositAmount
    );

    const txObject = await buildFinalTxObject(
      finalCallData,
      _CHAIN_ID,
      stUSD,
      _PROVIDER
    );

    console.log("Sending final transaction...");
    const depositTx = await _SIGNER.sendTransaction(txObject);

    await depositTx.wait();
    console.log("Single Chain Deposit transaction receipt received.");
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

depositAngle("0.1", "ARBITRUM");
