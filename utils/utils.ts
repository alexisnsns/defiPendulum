import { ethers } from "ethers";

import dotenv from "dotenv";
dotenv.config();

import {
  ERC20_ABI,
  DEPOSIT_V3_SELECTOR,
  UNIQUE_IDENTIFIER,
  DELIMITER,
  MULTICALL_HANDLER_ADDRESS,
} from "./resources.js";

import { BASE_WALLET } from "./ethersUtils.js";

// SINGLE CHAIN DEPOSIT
export async function generateSingleChainDepositCallDataAave(
  amount: bigint,
  depositCurrency: string
) {
  const userAddress = await BASE_WALLET.getAddress();

  const supplyAaveABI = [
    "function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external",
  ];
  const defiInterface = new ethers.Interface(supplyAaveABI);

  const args = [depositCurrency, amount, userAddress, 0];

  const callData = defiInterface.encodeFunctionData("supply", args);
  return callData;
}

export async function generateSingleChainDepositCallDataFluid(amount: bigint) {
  const userAddress = await BASE_WALLET.getAddress();

  const supplyMorphoABI = [
    "function deposit(uint256 assets, address receiver) public override returns (uint256 shares)",
  ];
  // const supplyAaveABI = [
  //   "function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external",
  // ];

  const defiInterface = new ethers.Interface(supplyMorphoABI);

  const args = [amount, userAddress];

  // name changes for fluid
  const callData = defiInterface.encodeFunctionData("deposit", args);
  return callData;
}

// Generate message for Multicall Handler
export function generateAccrossCallData(
  userAddress,
  aaveAddress,
  depositAmount,
  depositCurrency,
  aaveReferralCode = 0
) {
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();

  // ABI
  const approveFunction = "function approve(address spender, uint256 value)";
  const depositFunction =
    "function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)";

  const erc20Interface = new ethers.Interface([approveFunction]);
  const aaveInterface = new ethers.Interface([depositFunction]);

  const approveCalldata = erc20Interface.encodeFunctionData("approve", [
    aaveAddress,
    depositAmount,
  ]);
  const depositCalldata = aaveInterface.encodeFunctionData("supply", [
    depositCurrency,
    depositAmount,
    userAddress,
    aaveReferralCode,
  ]);

  //instructions
  const instructions = [
    {
      target: depositCurrency,
      callData: approveCalldata,
      value: 0,
    },
    {
      target: aaveAddress,
      callData: depositCalldata,
      value: 0,
    },
  ];

  return abiCoder.encode(
    [
      "tuple(tuple(address target, bytes callData, uint256 value)[] calls, address fallbackRecipient)",
    ],
    [
      {
        calls: instructions,
        fallbackRecipient: userAddress,
      },
    ]
  );
}

export function generateAccrossCallDataFluid(
  userAddress,
  aaveAddress,
  depositAmount,
  depositCurrency,
  aaveReferralCode = 0
) {
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();

  // ABI
  const approveFunction = "function approve(address spender, uint256 value)";
  // const depositFunction =
  //   "function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)";

  const supplyMorphoABI =
    "function deposit(uint256 assets, address receiver) public override returns (uint256 shares)";
  const erc20Interface = new ethers.Interface([approveFunction]);
  const aaveInterface = new ethers.Interface([supplyMorphoABI]);

  const approveCalldata = erc20Interface.encodeFunctionData("approve", [
    aaveAddress,
    depositAmount,
  ]);
  // TODO: should be retrofit to include Aave
  const depositCalldata = aaveInterface.encodeFunctionData("deposit", [
    depositAmount,
    userAddress,
  ]);

  //instructions
  const instructions = [
    {
      target: depositCurrency,
      callData: approveCalldata,
      value: 0,
    },
    {
      target: aaveAddress,
      callData: depositCalldata,
      value: 0,
    },
  ];

  return abiCoder.encode(
    [
      "tuple(tuple(address target, bytes callData, uint256 value)[] calls, address fallbackRecipient)",
    ],
    [
      {
        calls: instructions,
        fallbackRecipient: userAddress,
      },
    ]
  );
}

export async function getAccrossSuggestedFees(
  inputToken: string,
  outputToken: string,
  inputAmount: bigint,
  destinationChainId: number,
  originChainId: number,
  recipient: string,
  message: string
) {
  const url = new URL("https://app.across.to/api/suggested-fees");

  url.searchParams.append("inputToken", inputToken);
  url.searchParams.append("outputToken", outputToken);
  url.searchParams.append("originChainId", originChainId.toString());
  url.searchParams.append("destinationChainId", destinationChainId.toString());
  url.searchParams.append("amount", inputAmount.toString());
  url.searchParams.append("recipient", recipient);

  if (message) {
    const messageHex = message.startsWith("0x")
      ? message
      : `0x${Buffer.from(message).toString("hex")}`;
    url.searchParams.append("message", messageHex);
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      console.error("API Response:", errorText);
      throw new Error(
        `API request failed with status ${response.status}: ${errorText}`
      );
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching suggested fees:", error);
    throw error;
  }
}

export async function buildBridgeDepositLogic(
  userAddress: string,
  depositAmount: bigint,
  inputToken: string,
  inputChainID: number,
  outputToken: string,
  outputChainID: number,
  outputPoolAddress: string
) {
  // TODO: should be adapted to aave
  const initialMessage = generateAccrossCallDataFluid(
    userAddress,
    outputPoolAddress,
    depositAmount,
    outputToken,
    0 // referral code
  );

  // console.log("initial message OK");

  const suggestedFees = await getAccrossSuggestedFees(
    inputToken,
    outputToken,
    depositAmount,
    outputChainID,
    inputChainID,
    MULTICALL_HANDLER_ADDRESS,
    initialMessage
  );

  // console.log("Suggested fees received OK");
  const outputAmount =
    depositAmount - ethers.toBigInt(suggestedFees.relayFeeTotal);

  // Generate the final message with the output amount
  // TODO: should be adapted to aave
  const finalMessage = generateAccrossCallDataFluid(
    userAddress,
    outputPoolAddress,
    outputAmount,
    outputToken,
    0 // referral code
  );
  return { finalMessage, outputAmount };
}

export async function buildAccrossCallData(
  depositAmount: bigint,
  inputToken: string,
  inputChainID: number,
  outputToken: string,
  outputChainID: number,
  outputPoolAddress: string
) {
  // address is the same for all chains
  const userAddress = await BASE_WALLET.getAddress();

  const { finalMessage, outputAmount } = await buildBridgeDepositLogic(
    userAddress,
    depositAmount,
    inputToken,
    inputChainID,
    outputToken,
    outputChainID,
    outputPoolAddress
  );

  const diff =
    depositAmount > outputAmount
      ? depositAmount - outputAmount
      : outputAmount - depositAmount;

  const diffPercentage = Number(diff) / Number(depositAmount);

  if (diffPercentage > 0.005) {
    console.log("⚠️ Bridge slippage is more than 0.5% — aborting");
    return;
  } else {
    console.log(
      "Bridge slippage ok;",
      diffPercentage?.toFixed(4),
      "%; proceeding."
    );
  }

  const currentTime = Math.floor(Date.now() / 1000);

  // Use ethers.AbiCoder directly for precise control over encoding
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();

  const encodedParams = abiCoder.encode(
    [
      "address",
      "address",
      "address",
      "address",
      "uint256",
      "uint256",
      "uint256",
      "address",
      "uint32",
      "uint32",
      "uint32",
      "bytes",
    ],
    [
      userAddress, // depositor (user address)
      MULTICALL_HANDLER_ADDRESS, // recipient (multicall handler)
      inputToken, // inputToken
      outputToken, // outputToken
      depositAmount, // inputAmount
      outputAmount, // outputAmount
      ethers.getBigInt(outputChainID), // destinationChainId
      ethers.ZeroAddress, // exclusiveRelayer (none)
      currentTime, // quoteTimestamp
      currentTime + 7200, // fillDeadline (2 hours from now)
      0, // exclusivityDeadline (none)
      finalMessage, // message
    ]
  );

  // Manually construct the data with the correct function selector
  let manualData = DEPOSIT_V3_SELECTOR + encodedParams.substring(2); // Remove '0x' from params

  // Append the unique identifier to the calldata (required by Across)
  const finalData =
    "0x" + manualData.substring(2) + DELIMITER + UNIQUE_IDENTIFIER;

  return finalData;
}

export async function approveUSDCSpending(
  depositAmount: bigint,
  USDCContractAddress: string,
  spenderAddress: string,
  signer: ethers.Signer,
) {
  const usdcContract = new ethers.Contract(
    USDCContractAddress,
    ERC20_ABI,
    signer
  );

  try {
    // Set a fixed gas limit (no estimate, just a predefined value)
    const gasLimit = ethers.toBigInt(2000000);

    // Call approve with the fixed gas limit
    const approveTx = await usdcContract.approve(
      spenderAddress,
      depositAmount,
      {
        gasLimit: gasLimit,
      }
    );

    // console.log("Approval transaction submitted.");
    await approveTx.wait();
    console.log("Approval transaction receipt received.");
  } catch (error) {
    console.error("Error approving USDC:", error);
  }
}

export async function buildFinalTxObject(
  finalCallData: string,
  srcChainID: number,
  targetAddress: string,
  provider: ethers.Provider
) {
  const feeData = await provider.getFeeData();

  // Build final tx object
  const txObject = {
    to: targetAddress,
    data: finalCallData,
    value: ethers.toBigInt(0),
    chainId: srcChainID,
    type: 2,
    gasLimit: ethers.toBigInt(2000000),
    maxFeePerGas: feeData.maxFeePerGas
      ? ethers.toBigInt(Math.floor(Number(feeData.maxFeePerGas) * 1.3))
      : ethers.parseUnits("5", "gwei"),

    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas
      ? ethers.toBigInt(Math.floor(Number(feeData.maxPriorityFeePerGas) * 1.3))
      : ethers.parseUnits("1.5", "gwei"),
  };

  // Safety check: priority fee ≤ max fee
  if (txObject.maxPriorityFeePerGas > txObject.maxFeePerGas) {
    txObject.maxPriorityFeePerGas = txObject.maxFeePerGas;
  }

  return txObject;
}

// WITHDRAW
export async function generateWithdrawCallDataAave(
  withdrawAmount: bigint,
  depositCurrency: string
) {
  // address is the same for all chains
  const userAddress = await BASE_WALLET.getAddress();

  const ABI = [
    "function withdraw(address asset, uint256 amount, address to) external returns (uint256)",
  ];

  const aaveInterface = new ethers.Interface(ABI);

  withdrawAmount = ethers.toBigInt(withdrawAmount);

  const withdrawCalldata = aaveInterface.encodeFunctionData("withdraw", [
    depositCurrency,
    withdrawAmount,
    userAddress,
  ]);

  return withdrawCalldata;
}

export async function generateWithdrawCallDataFluid(withdrawAmount: bigint) {
  // address is the same for all chains
  const userAddress = await BASE_WALLET.getAddress();

  const withdrawMorphoABI = [
    "function withdraw(uint256 assets, address receiver, address owner) public override returns (uint256 shares)",
  ];

  const fluidInterface = new ethers.Interface(withdrawMorphoABI);

  withdrawAmount = ethers.toBigInt(withdrawAmount);

  const withdrawCalldata = fluidInterface.encodeFunctionData("withdraw", [
    withdrawAmount,
    userAddress,
    userAddress,
  ]);

  return withdrawCalldata;
}

export async function generateSingleChainDepositCallDataAngle(amount: bigint) {
  const userAddress = await BASE_WALLET.getAddress();

  const supplyAngleABI = [
    "function deposit(uint256 assets, address receiver) public override returns (uint256 shares)",
  ];

  const defiInterface = new ethers.Interface(supplyAngleABI);

  const args = [amount, userAddress];

  const callData = defiInterface.encodeFunctionData("deposit", args);
  // console.log("callData", callData);
  return callData;
}

export async function generateMintUSDACallDataAngle(
  amountIn: bigint,
  minAmountOut: bigint,
  tokenIn: string,
  tokenOut: string
) {
  const userAddress = await BASE_WALLET.getAddress();

  const mintUSDA = [
    "function swapExactInput( uint256 amountIn, uint256 amountOutMin, address tokenIn, address tokenOut, address to, uint256 deadline)",
  ];

  const defiInterface = new ethers.Interface(mintUSDA);

  const args = [amountIn, minAmountOut, tokenIn, tokenOut, userAddress, "0x0"];

  const callData = defiInterface.encodeFunctionData("swapExactInput", args);
  // console.log("callData", callData);
  return callData;
}

export function generateAccrossCallDataAngle(
  userAddress: string,
  transmitterAddress: string,
  depositAmount: bigint,
  depositCurrency: string
) {
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  const MULTICALL_HANDLER_ADDRESS =
    "0x924a9f036260DdD5808007E1AA95f08eD08aA569";

  // approve USDC
  const approveFunction = "function approve(address spender, uint256 value)";

  const erc20Interface = new ethers.Interface([approveFunction]);

  const mintUSDA = [
    "function swapExactInput( uint256 amountIn, uint256 amountOutMin, address tokenIn, address tokenOut, address to, uint256 deadline)",
  ];
  const mintUSDAInterface = new ethers.Interface(mintUSDA);

  const approveCalldata = erc20Interface.encodeFunctionData("approve", [
    transmitterAddress,
    depositAmount,
  ]);

  const stUSD = "0x0022228a2cc5E7eF0274A7Baa600d44da5aB5776";
  const USDA = "0x0000206329b97DB379d5E1Bf586BbDB969C63274";

  const MAX_UINT256 = ethers.MaxUint256;

  const approveUSDACalldata = erc20Interface.encodeFunctionData("approve", [
    stUSD,
    MAX_UINT256,
  ]);

  // minAmount of USDA removes 1% for slippage and sets with 18 decimals
  const minAmount = (depositAmount * 99n * 10n ** 12n) / 100n;

  const swapCallData = mintUSDAInterface.encodeFunctionData("swapExactInput", [
    depositAmount,
    minAmount,
    depositCurrency,
    USDA,
    // mint to Accross to be able to deposit afterwards
    MULTICALL_HANDLER_ADDRESS,
    "0x0",
  ]);

  const depositAngleABI = [
    "function deposit(uint256 assets, address receiver) public override returns (uint256 shares)",
  ];

  const stusdInterface = new ethers.Interface(depositAngleABI);

  const depositCallData = stusdInterface.encodeFunctionData("deposit", [
    minAmount,
    userAddress,
  ]);

  const instructions = [
    // 1/ approve usdc spending from transmitter (on usdc contract)
    {
      target: depositCurrency,
      callData: approveCalldata,
      value: 0,
    },
    // 2/swapExactInput (on transmitter contract)
    {
      target: transmitterAddress,
      callData: swapCallData,
      value: 0,
    },
    // 3/approve usda spending from stUSD contract (on usda contract)
    {
      target: USDA,
      callData: approveUSDACalldata,
      value: 0,
    },
    // // 4/ mint stUSD (on stUSD contract)
    {
      target: stUSD,
      callData: depositCallData,
      value: 0,
    },
  ];

  return abiCoder.encode(
    [
      "tuple(tuple(address target, bytes callData, uint256 value)[] calls, address fallbackRecipient)",
    ],
    [
      {
        calls: instructions,
        fallbackRecipient: userAddress,
      },
    ]
  );
}
// HERE

export async function buildBridgeDepositLogicAngle(
  userAddress: string,
  depositAmount: bigint,
  inputToken: string,
  inputChainID: number,
  outputToken: string,
  outputChainID: number,
  outputPoolAddress: string
) {
  const initialMessage = generateAccrossCallDataAngle(
    userAddress,
    outputPoolAddress,
    depositAmount,
    inputToken
  );

  console.log("initial message OK");

  const suggestedFees = await getAccrossSuggestedFees(
    inputToken,
    outputToken,
    depositAmount,
    outputChainID,
    inputChainID,
    MULTICALL_HANDLER_ADDRESS,
    initialMessage
  );

  console.log("Suggested fees received OK");
  const outputAmount =
    depositAmount - ethers.toBigInt(suggestedFees.relayFeeTotal);

  // Generate the final message with the output amount
  const finalMessage = generateAccrossCallDataAngle(
    userAddress,
    outputPoolAddress,
    outputAmount,
    outputToken
  );
  return { finalMessage, outputAmount };
}

export async function buildAngleAccrossCallData(
  depositAmount: bigint,
  inputToken: string,
  inputChainID: number,
  outputToken: string,
  outputChainID: number,
  outputPoolAddress: string
) {
  // address is the same for all chains
  const userAddress = await BASE_WALLET.getAddress();

  const { finalMessage, outputAmount } = await buildBridgeDepositLogicAngle(
    userAddress,
    depositAmount,
    inputToken,
    inputChainID,
    outputToken,
    outputChainID,
    outputPoolAddress
  );

  const currentTime = Math.floor(Date.now() / 1000);

  // Use ethers.AbiCoder directly for precise control over encoding
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();

  const encodedParams = abiCoder.encode(
    [
      "address",
      "address",
      "address",
      "address",
      "uint256",
      "uint256",
      "uint256",
      "address",
      "uint32",
      "uint32",
      "uint32",
      "bytes",
    ],
    [
      userAddress, // depositor (user address)
      MULTICALL_HANDLER_ADDRESS, // recipient (multicall handler)
      inputToken, // inputToken
      outputToken, // outputToken
      depositAmount, // inputAmount
      outputAmount, // outputAmount
      ethers.getBigInt(outputChainID), // destinationChainId
      ethers.ZeroAddress, // exclusiveRelayer (none)
      currentTime, // quoteTimestamp
      currentTime + 7200, // fillDeadline (2 hours from now)
      0, // exclusivityDeadline (none)
      finalMessage, // message
    ]
  );

  // Manually construct the data with the correct function selector
  let manualData = DEPOSIT_V3_SELECTOR + encodedParams.substring(2); // Remove '0x' from params

  // Append the unique identifier to the calldata (required by Across)
  const finalData =
    "0x" + manualData.substring(2) + DELIMITER + UNIQUE_IDENTIFIER;

  return finalData;
}
