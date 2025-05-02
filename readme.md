DEFI PENDULUM

This script is a defi positions rebalancer written in Typescript, coupled to a twitter bot written in Python.

The script fetches the available USDC of a user on different networks, and fetches the highest yield on Morpho and Fluid pools.

The script 1/deploys unused USDC to the highest yielding pool when available and 2/ bridges the user positions between chains to benefit from the highest APY available at all times.

It then posts every action on a twitter bot (@defiautopilot).

It was made using Accross for the bridge, the Graph subgraphs to fetch the yields, ethers.js, and tweepy for the twitter bot.

The cronjob runs on AWS.

Feel free to take whatever you want (autopilot bot / twitter bot) and iterate (eg. by adding other providers, right now it is limited to 6 vaults on Morpho and Fluid).

To make it work locally:

- Just put the seedphrase in a .env at the root of the project, along with your subgraph key (to fetch the yields in real time from the graph)
- run npm install then 'npm run defiPendulum' in your terminal (this will run the autopilot bot, not the twitter bot, which prints the logs written on an AWS EC2 instance)
