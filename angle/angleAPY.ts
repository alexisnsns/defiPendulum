import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider("https://arb1.arbitrum.io/rpc");

const contractAddress = "0x0022228a2cc5E7eF0274A7Baa600d44da5aB5776";

const abi = ["function estimatedAPR() view returns (uint256)"];

const contract = new ethers.Contract(contractAddress, abi, provider);

async function fetchAngleAPR() {
  try {
    const aprRaw = await contract.estimatedAPR();
    const aprFormatted = Number(ethers.formatUnits(aprRaw, 18)).toFixed(2);
    console.log(`Estimated APR: ${aprFormatted} `);
  } catch (error) {
    console.error("Error reading APR:", error);
  }
}

fetchAngleAPR();
