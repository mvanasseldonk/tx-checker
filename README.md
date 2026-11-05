# Ancoro

**Did my transaction go through?** Paste a transaction, get one clear answer.

Try it at **[ancoro.site](https://www.ancoro.site)**. No account, no wallet connection.

Ancoro follows your transaction until it's final and shows only what matters: did it go through, how much was sent, and how long until it can't be reversed. Keep the page open and it updates by itself.

## What you can paste

- A transaction hash, Bitcoin txid or Solana signature
- An address, to see its latest transaction
- An ENS name, such as `vitalik.eth`
- A link from a block explorer (Etherscan, Basescan, Arbiscan, Optimistic Etherscan, Solscan, mempool.space, Blockstream, Solana Explorer, Blockchair, or Blockscout)

| Network  | Transactions | Addresses and ENS | Explorer links                      | Final after                    |
| -------- | ------------ | ----------------- | ----------------------------------- | ------------------------------ |
| Ethereum | Yes          | Yes               | Etherscan, Blockchair, Blockscout   | Finalized by Ethereum, ~14 min |
| Base     | Yes          | Not yet           | Basescan, Blockscout                | Finalized on Ethereum, ~14 min |
| Arbitrum | Yes          | Not yet           | Arbiscan, Blockscout                | Finalized on Ethereum, ~20 min |
| Optimism | Yes          | Not yet           | Optimistic Etherscan, Blockscout    | Finalized on Ethereum, ~25 min |
| Solana   | Yes          | Yes (no ENS)      | Solscan, Solana Explorer            | Finalized by Solana            |
| Bitcoin  | Yes          | Yes (no ENS)      | mempool.space, Blockstream.info, Blockchair | Six confirmations, ~1 hour     |

Mainnets only. A hash doesn't say which network it's from, so Ancoro checks Ethereum, Base, Arbitrum and Optimism at once and shows the one that has it. The times for Ethereum and the L2s were measured in November 2026 and are estimates. Address and ENS support on L2s is planned in [#47](https://github.com/mvanasseldonk/tx-checker/issues/47).

## What the words mean

- **Pending:** sent, but not in a block yet.
- **Success:** in a block. It went through, and is on its way to final.
- **Final:** permanent. It can't be reversed anymore.
- **Failed:** it didn't go through. The amount wasn't sent, but a fee can still be charged.

## Privacy

Ancoro only reads public blockchain data. It never asks for your keys and can't touch your funds. There are no accounts and no tracking, and it keeps no history of what you check.

To answer you, the server does pass what you paste on to data providers: [Alchemy](https://www.alchemy.com) for Ethereum and the L2s, [Helius](https://www.helius.dev) for Solana, [mempool.space](https://mempool.space) and [Blockstream](https://blockstream.info) for Bitcoin, [CoinGecko](https://www.coingecko.com) for euro prices, and [Etherscan](https://etherscan.io) for contract names when a key is set. [Vercel](https://vercel.com) hosts the app, and its request logs can contain the page you opened for a short time.

## Run it locally

You need Node.js 20.9 or newer and an [Alchemy](https://dashboard.alchemy.com) key, with Ethereum, Base, Arbitrum and Optimism enabled in the Alchemy app.

```bash
npm install
cp .env.example .env.local   # then fill in your keys
npm run dev
```

| Variable            | Needed?              | What for                                                 |
| ------------------- | -------------------- | -------------------------------------------------------- |
| `ALCHEMY_API_KEY`   | Yes                  | Ethereum, Base, Arbitrum and Optimism                    |
| `HELIUS_API_KEY`    | Yes, in production   | Solana. Without it, a public endpoint with low limits    |
| `COINGECKO_API_KEY` | No                   | Higher rate limits for euro prices                       |
| `ETHERSCAN_API_KEY` | No                   | Names of verified contracts, beyond the well-known ones  |

Bitcoin needs no key. Keep your keys in `.env.local`, which git ignores.

```bash
npm test        # unit tests
npm run lint
npm run build
```

Built with Next.js, React, Tailwind CSS and [viem](https://viem.sh), tested with Vitest, deployed on Vercel.

## How it's made

Ancoro is a product experiment: a product owner decides what to build and tests it, and AI agents ([Claude](https://claude.com/claude-code)) write and review the code. The stories and their acceptance criteria are in the [issues](https://github.com/mvanasseldonk/tx-checker/issues?q=is%3Aissue).

## License

[MIT](LICENSE)
