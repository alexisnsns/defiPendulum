const endpoint = "https://blue-api.morpho.org/graphql";

const morphoVaults = [
  {
    chain: "Base",
    address: "0xc1256ae5ff1cf2719d4937adb3bbccab2e00a2ca",
    ID: "1",
  },
  {
    chain: "Base",
    address: "0x616a4e1db48e22028f6bbf20444cd3b8e3273738",
    ID: "2",
  },
  {
    chain: "Base",
    address: "0x7bfa7c4f149e7415b73bdedfe609237e29cbf34a",
    ID: "3",
  },
];

export const fetchAllMorphoAPYs = async (): Promise<
  { chain: string; apy: number; ID: string }[]
> => {
  const results: { chain: string; apy: number; ID: string }[] = [];

  for (const vault of morphoVaults) {
    const query = `
      query {
        vaultByAddress(address: "${vault.address}", chainId: 8453) {
          state {
            dailyNetApy
          }
        }
      }
    `;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      const result = await response.json();

      const dailyNetApy = result?.data?.vaultByAddress?.state?.dailyNetApy || 0;
      const formattedAPY = (dailyNetApy * 100).toFixed(2);

      results.push({
        chain: vault.chain,
        apy: Number(formattedAPY),
        ID: vault.ID,
      });
    } catch (error) {
      console.error(
        `Error fetching Morpho APY for vault ${vault.chain}:`,
        error
      );
      results.push({
        chain: vault.chain,
        apy: 0,
        ID: vault.ID,
      });
    }
  }

  // console.log(results);
  return results;
};

fetchAllMorphoAPYs();
