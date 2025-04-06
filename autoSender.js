require("dotenv").config();
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

// Load environment variables
const RPC_URL = process.env.RPC_URL;
const CHAIN_ID = parseInt(process.env.CHAIN_ID);
const PRIVATE_KEYS = process.env.PRIVATE_KEYS.split(",");
const NATIVE_MIN = parseFloat(process.env.NATIVE_MIN || "0.005");
const NATIVE_MAX = parseFloat(process.env.NATIVE_MAX || "0.01");
const NATIVE_PROB = parseFloat(process.env.NATIVE_PROBABILITY || "0.3");

// Load files
const ADDRESS_FILE = path.resolve(__dirname, "address.txt");
const TOKENS_FILE = path.resolve(__dirname, "tokens.json");
const SENT_FILE = path.resolve(__dirname, "sent.json");
const LOG_FILE = path.resolve(__dirname, "log.txt");

const ADDRESS_LIST = fs.readFileSync(ADDRESS_FILE, "utf-8")
  .split("\n")
  .map(line => line.trim())
  .filter(line => line !== "");

const TOKEN_LIST = JSON.parse(fs.readFileSync(TOKENS_FILE, "utf-8"));

function loadSent() {
  if (!fs.existsSync(SENT_FILE)) return {};
  return JSON.parse(fs.readFileSync(SENT_FILE, "utf-8"));
}

function saveSent(data) {
  fs.writeFileSync(SENT_FILE, JSON.stringify(data, null, 2));
}

function log(message) {
  const time = new Date().toISOString();
  const fullMsg = `[${time}] ${message}\n`;
  console.log(fullMsg.trim());
  fs.appendFileSync(LOG_FILE, fullMsg);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getRandomDelay(min = 5000, max = 20000) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getWalletDelay() {
  return getRandomDelay(180000, 420000);
}

function shouldSendNative() {
  return Math.random() < NATIVE_PROB;
}

function getRandomNativeAmount() {
  return (Math.random() * (NATIVE_MAX - NATIVE_MIN) + NATIVE_MIN).toFixed(6);
}

function getRandomTokenWithAmount() {
  const token = TOKEN_LIST[Math.floor(Math.random() * TOKEN_LIST.length)];
  const amount = (Math.random() * (token.max - token.min) + token.min).toFixed(6);
  return { address: token.address.toLowerCase(), amount };
}

function shuffle(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

async function tryWithRetry(fn, retries = 3, delay = 5000, walletAddr, targetAddr) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      log(`[${walletAddr}] Retry ${attempt} failed for ${targetAddr}: ${err.message}`);
      if (attempt < retries) await sleep(delay);
    }
  }
  throw new Error(`[${walletAddr}] Failed after ${retries} retries for ${targetAddr}`);
}

const ERC20_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address account) view returns (uint256)"
];

async function sendTokens() {
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL, CHAIN_ID);
  const recipients = shuffle(ADDRESS_LIST);
  const sentData = loadSent();

  for (const pk of PRIVATE_KEYS) {
    try {
      const wallet = new ethers.Wallet(pk, provider);
      const walletAddr = wallet.address.toLowerCase();
      log(`\n[${walletAddr}] Starting transfer to ${recipients.length} address(es)...`);

      if (!sentData[walletAddr]) sentData[walletAddr] = {};

      for (const to of recipients) {
        const toAddr = to.toLowerCase();
        const isNative = shouldSendNative();

        const { address: tokenAddr, amount } = isNative
          ? { address: "native", amount: getRandomNativeAmount() }
          : getRandomTokenWithAmount();

        const alreadySent = sentData[walletAddr][tokenAddr]?.includes(toAddr);
        if (alreadySent) {
          log(`[${walletAddr}] Skipped duplicate: ${toAddr} already sent ${tokenAddr}`);
          continue;
        }

        try {
          if (isNative) {
            const tx = await tryWithRetry(
              () => wallet.sendTransaction({
                to: toAddr,
                value: ethers.utils.parseEther(amount)
              }),
              3,
              5000,
              walletAddr,
              toAddr
            );
            log(`[${walletAddr}] Sent ${amount} native coin to ${toAddr} | TX: ${tx.hash}`);
            await tx.wait();
          } else {
            const token = new ethers.Contract(tokenAddr, ERC20_ABI, wallet);
            const decimals = await token.decimals();
            const balance = await token.balanceOf(walletAddr);
            const amountToSend = ethers.utils.parseUnits(amount, decimals);

            if (balance.gte(amountToSend)) {
              const gasPrice = await provider.getGasPrice();
              const tx = await tryWithRetry(
                () => token.transfer(toAddr, amountToSend, { gasPrice }),
                3,
                5000,
                walletAddr,
                toAddr
              );
              log(`[${walletAddr}] Sent ${amount} ${tokenAddr} to ${toAddr} | TX: ${tx.hash}`);
              await tx.wait();
            } else {
              log(`[${walletAddr}] Skipped: Low token balance for ${tokenAddr}`);
              continue;
            }
          }

          // Mark as sent
          if (!sentData[walletAddr][tokenAddr]) sentData[walletAddr][tokenAddr] = [];
          sentData[walletAddr][tokenAddr].push(toAddr);
          saveSent(sentData);

          await sleep(getRandomDelay());
        } catch (err) {
          log(`[${walletAddr}] Error sending to ${toAddr}: ${err.message}`);
        }
      }

      log(`[${walletAddr}] Finished. Waiting before next wallet...`);
      await sleep(getWalletDelay());

    } catch (walletErr) {
      log(`[Wallet Error] Skipped wallet due to error: ${walletErr.message}`);
    }
  }
}

async function main() {
  try {
    await sendTokens();
  } catch (e) {
    log(`[MAIN] Fatal error: ${e.message}`);
  }

  setInterval(async () => {
    try {
      await sendTokens();
    } catch (e) {
      log(`[MAIN] Fatal error on interval: ${e.message}`);
    }
  }, 24 * 60 * 60 * 1000); // 24 jam
}

main();
