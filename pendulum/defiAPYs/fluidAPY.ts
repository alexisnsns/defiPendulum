import axios from "axios";

type ChainConfig = {
  chainID: string;
  tokenAddress: string;
  chain: string;
};

const CHAINS: ChainConfig[] = [
  {
    chainID: "8453",
    tokenAddress: "0xf42f5795D9ac7e9D757dB633D693cD548Cfd9169",
    chain: "Base",
  },
  {
    chainID: "42161",
    tokenAddress: "0x1A996cb54bb95462040408C06122D45D6Cdb6096",
    chain: "Arbitrum",
  },
  {
    chainID: "137",
    tokenAddress: "0x571d456b578fDC34E26E6D636736ED7c0CDB9d89",
    chain: "Polygon",
  },
];

export const fetchFluidAPY = async (
  chainID: string,
  tokenAddress: string
): Promise<number | null> => {
  const fluidURL = `https://api.fluid.instadapp.io/${chainID}/tokens`;

  try {
    const response = await axios.get(fluidURL);
    const allPositions = response.data.data;

    const position = allPositions.find(
      (pos: any) => pos.address?.toLowerCase() === tokenAddress.toLowerCase()
    );

    const rewardRate = Number(position?.rewards?.[0]?.rate ?? 0);
    const totalRate = Number(position?.totalRate ?? 0);
    const combinedRate = (rewardRate + totalRate) / 100;

    return combinedRate;
  } catch (err) {
    console.error(`Error fetching APY for chain ${chainID}:`, err);
    return null;
  }
};

export const fetchAllFluidAPYs = async () => {
  const results = await Promise.all(
    CHAINS.map(async ({ chainID, tokenAddress, chain }) => {
      const apy = await fetchFluidAPY(chainID, tokenAddress);
      // console.log(
      //   `${chain} APY: ${apy !== null ? (apy * 100).toFixed(2) + "%" : "Error"}`
      // );
      return { chain, apy, ID: null };
    })
  );

  // Sort by highest APY first (nulls go last)
  const sortedResults = results.sort((a, b) => {
    if (a.apy === null) return 1;
    if (b.apy === null) return -1;
    return b.apy - a.apy;
  });

  return sortedResults;
};
