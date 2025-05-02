DEFI PENDULUM

This script is a defi positions rebalancer.
The script fetches the available USDC on different networks, and fetches the highest yield on AAVE pools.
The script 1/deploys unused USDC to the highest yielding pool when available and 2/ moves the user positions between chains to benefit from the highest APY available at all times.

To make it work:

- Just put the seedphrase in a .env at the root of the project
- run npm install then 'npm run optimize' in your terminal
