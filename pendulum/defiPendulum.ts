// APY
import { fetchAllFluidAPYs } from "./defiAPYs/fluidAPY.js";
import { fetchAllMorphoAPYs } from "./defiAPYs/morphoAPY.js";

// DeFi Positions
import { getUserFluidPositions } from "./defiPositions/fluidPositions.js";
import { getUserMorphoPositions } from "./defiPositions/morphoPositions.js";

// Utils
import { getUserUSDCBalance } from "./utils/usdcBalancesCheck.js";

// Actions
import {
  depositUSDCToFluidMorphoSingleChain,
  depositUSDCToFluidMorphoCrossChain,
} from "./depositFluidMorpho.js";
import { withdrawUSDCFromFluidMorpho } from "./withdrawFluidMorpho.js";

////////////////////////////////////////////////////////////

const fetchPoolsAPYs = async () => {
  try {
    const fluidAPYs = await fetchAllFluidAPYs();
    const morphoAPYs = await fetchAllMorphoAPYs();

    const allPools = [...fluidAPYs, ...morphoAPYs];

    const highestAPYpool = allPools.reduce((max, curr) =>
      curr.apy > max.apy ? curr : max
    );
    return highestAPYpool;
  } catch (error) {
    console.log("error fetching APYs", error);
    return;
  }
};

const fetchDefiPositions = async () => {
  try {
    const userFluidBalances = await getUserFluidPositions();
    const userMorphoBalances = await getUserMorphoPositions();

    const allDefiBalances = [...userFluidBalances, ...userMorphoBalances];
    console.log("Current position:");
    for (const { chain, balance, ID } of allDefiBalances) {
      if (Number(balance) > 0.1) {
        const poolLabel = ID ? ` (Pool ${ID})` : "";
        console.log(`${chain}${poolLabel}: ${Number(balance).toFixed(2)} USDC`);
      }
    }
    return allDefiBalances;
  } catch (error) {
    console.log("error fetching defi positions", error);
    return;
  }
};

const optimize = async () => {
  try {
    // Step 1: Fetch the pool with the highest APY
    const highestAPYpool = await fetchPoolsAPYs();
    // Step 2: Fetch user's existing DeFi positions
    const allDefiBalances = await fetchDefiPositions();

    const bestChain = highestAPYpool.chain;
    const bestID = highestAPYpool.ID;

    // const bestID = null
    // const bestChain = "POLYGON";

    console.log(
      `Best APY: ${highestAPYpool.apy}% on ${bestChain} (ID:${bestID})`
    );

    // Step 3: Check if any positions do not match the highest APY and withdraw
    for (const { chain, balance, ID } of allDefiBalances) {
      if (
        Number(balance) > 0.1 &&
        (chain.toUpperCase() !== bestChain.toUpperCase() || ID !== bestID)
      ) {
        // console.log(
        //   `Withdrawing the whole position (${balance} USDC) on ${chain} (ID:${ID}) as the yield is lower than the one available on ${bestChain} (ID:${bestID})...`
        // );
        await withdrawUSDCFromFluidMorpho(balance.toString(), chain, ID);
      } else if (
        Number(balance) <= 0.1 &&
        chain.toUpperCase() !== bestChain.toUpperCase()
      ) {
        console.log(
          `Balance (${Number(balance).toFixed(
            2
          )} USDC) on ${chain} not worth a withdrawal.`
        );
      } else if (
        chain.toUpperCase() === bestChain.toUpperCase() &&
        ID === bestID
      ) {
        console.log(
          `Position (${Number(balance).toFixed(
            2
          )} USDC) on ${chain}) is optimal.`
        );
      }
    }
    // console.log("--------------");
    // Step 2: Fetch user's USDC balances
    const userBalances = await getUserUSDCBalance();
    for (const [chain, balance] of Object.entries(userBalances)) {
      if (Number(balance) > 0.1) {
        console.log(`${chain}: ${balance} undeployed USDC`);
      }
    }

    // console.log("--------------");
    for (const [chain, balance] of Object.entries(userBalances)) {
      if (
        chain.toUpperCase() === bestChain.toUpperCase() &&
        Number(balance) > 0.1
      ) {
        // console.log(
        //   `Initiating ${balance} USDC single chain deposit ${chain} <> ${chain} to get this juicy ${highestAPYpool.apy}% APY...`
        // );
        await depositUSDCToFluidMorphoSingleChain(
          balance.toString(),
          bestChain,
          bestID
        );
      } else if (
        chain.toUpperCase() !== bestChain.toUpperCase() &&
        Number(balance) > 0.5
      ) {
        // console.log(
        //   `Initiating ${balance} USDC cross-chain deposit from ${chain} to ${bestChain} to get this juicy ${highestAPYpool.apy}% APY...`
        // );
        await depositUSDCToFluidMorphoCrossChain(
          balance.toString(),
          chain,
          bestChain,
          bestID
        );
      } else {
        // console.log(
        //   `Not enough USDC on ${chain} (${balance}) to be worth a deposit`
        // );
      }
    }

    // console.log("--------------");
    // console.log("🎉 All good broski, yields are maximized.");
  } catch (error) {
    console.error("Error:", error);
  }
};

optimize();
