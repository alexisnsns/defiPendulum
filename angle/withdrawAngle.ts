import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config();

import { CHAIN_IDS, USDC_ADDRESSES } from "../utils/resources.js";

import {
  buildFinalTxObject,
  generateWithdrawCallDataFluid,
  approveUSDCSpending,
  generateMintUSDACallDataAngle,
} from "../utils/utils.js";

import { providers, wallets } from "../utils/ethersUtils.js";

////////////////////////////////////////////////////////////

export async function withdrawFromAngle(
  amountToWithdraw: string,
  chainName: string
) {
  const _CHAIN_ID = CHAIN_IDS[chainName.toUpperCase()];

  const _SIGNER = wallets[chainName.toUpperCase()];
  const _PROVIDER = providers[chainName.toUpperCase()];
  const _INPUT_TOKEN_ADDRESS = USDC_ADDRESSES[chainName.toUpperCase()];

  const stUSD = "0x0022228a2cc5E7eF0274A7Baa600d44da5aB5776";

  try {
    const withdrawAmount = ethers.parseUnits(amountToWithdraw, 18);
    const _withdrawAmount = ethers.parseUnits(amountToWithdraw, 6);

    // console.log(withdrawAmount);
    // console.log(_POOL_ADDRESS);
    // console.log(_CHAIN_ID);
    // console.log('provider:', _PROVIDER);
    // console.log('chainname:', chainName);

    const callData = await generateWithdrawCallDataFluid(withdrawAmount);

    const txObject = await buildFinalTxObject(
      callData,
      _CHAIN_ID,
      stUSD,
      _PROVIDER
    );

    console.log("Sending withdraw transaction...");

    const withdrawTx = await _SIGNER.sendTransaction(txObject);

    await withdrawTx.wait();
    console.log("Withdrew", amountToWithdraw, "USDA from stUSD contract");

    const angleTransmutter =
      chainName === "ARBITRUM"
        ? "0xD253b62108d1831aEd298Fc2434A5A8e4E418053"
        : "0x222222880e079445Df703c0604706E71a538Fd4f";

    const USDA = "0x0000206329b97DB379d5E1Bf586BbDB969C63274";

    // Approve USDA spending by the transmitter contract
    await approveUSDCSpending(
      withdrawAmount,
      USDA,
      // Address to approve
      angleTransmutter,
      _SIGNER
    );

    console.log(
      "Approved",
      amountToWithdraw,
      "USDA for burn by the transmitter"
    );

    // swap USDA<>USDC
    const burnCallData = await generateMintUSDACallDataAngle(
      withdrawAmount,
      // USDC has 6 decimals only
      _withdrawAmount,
      USDA,
      _INPUT_TOKEN_ADDRESS
    );

    const burnTxObject = await buildFinalTxObject(
      burnCallData,
      _CHAIN_ID,
      angleTransmutter,
      _PROVIDER
    );

    console.log("Sending burn transaction...");
    const burnTx = await _SIGNER.sendTransaction(burnTxObject);
    await burnTx.wait();
    console.log("Burn transaction receipt received, received USDC");
  } catch (error) {
    console.error("Error in withdraw process:", error);
  }
}

withdrawFromAngle("0.5", "ARBITRUM");
