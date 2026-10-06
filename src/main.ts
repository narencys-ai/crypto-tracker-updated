// ==========================================
// CryptoTrack - Main TypeScript
// ==========================================

type CryptoCoin = {
  id: string;
  name: string;
  symbol: string;
  rank: number;
  price: number;
  change24h: number;
  marketCap: number;
  volume24h: number;
};

type BinanceTicker = {
  lastPrice: string;
  priceChangePercent: string;
};

type FavoriteCoin = {
  id: string;
  name: string;
  symbol: string;
  price: number;
  change24h: number;
};

type LiveCoin = {
  symbol: string;
  name: string;
  short: string;
  price: number;
  change24h: number;
};

// ==========================================
// API
// ==========================================

const BINANCE_API = "https://api.binance.com/api/v3";
const PAPRIKA_API = "https://api.coinpaprika.com/v1";

const FAVORITES_KEY = "cryptotrack-favorites";

// ==========================================
// Live Coins
// ==========================================

const liveCoins: LiveCoin[] = [
  {
    symbol: "BTCUSDT",
    name: "Bitcoin",
    short: "BTC",
    price: 0,
    change24h: 0,
  },
  {
    symbol: "ETHUSDT",
    name: "Ethereum",
    short: "ETH",
    price: 0,
    change24h: 0,
  },
  {
    symbol: "SOLUSDT",
    name: "Solana",
    short: "SOL",
    price: 0,
    change24h: 0,
  },
];

// ==========================================
// DOM Elements
// ==========================================

const cryptoContainer =
  document.querySelector<HTMLElement>("#cryptoContainer");

const refreshBtn =
  document.querySelector<HTMLButtonElement>("#refreshBtn");

const top10RefreshBtn =
  document.querySelector<HTMLButtonElement>("#top10RefreshBtn");

const exportCsvBtn =
  document.querySelector<HTMLButtonElement>("#exportCsvBtn");

const searchInput =
  document.querySelector<HTMLInputElement>("#top10Search");

const top10ContainerElements =
  document.querySelectorAll<HTMLElement>("#top10Container");

const top10Container =
  top10ContainerElements.length > 0
    ? top10ContainerElements[top10ContainerElements.length - 1]
    : null;

const topGainers =
  document.querySelector<HTMLElement>("#topGainers");

const topLosers =
  document.querySelector<HTMLElement>("#topLosers");

const favoritesContainer =
  document.querySelector<HTMLElement>("#favoritesContainer");

const favoritesCount =
  document.querySelector<HTMLElement>("#favoritesCount");

const marketSentiment =
  document.querySelector<HTMLElement>("#marketSentiment");

const lastUpdate =
  document.querySelector<HTMLElement>("#lastUpdate");

const bitcoinCanvas =
  document.querySelector<HTMLCanvasElement>("#bitcoinChart");

// ==========================================
// State
// ==========================================

let top10Coins: CryptoCoin[] = [];
let bitcoinPrices: number[] = [];
let favorites: FavoriteCoin[] = loadFavorites();

// ==========================================
// Utility Functions
// ==========================================

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatPrice(price: number): string {
  if (!Number.isFinite(price)) {
    return "$0.00";
  }

  if (price >= 1000) {
    return `$${price.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  if (price >= 1) {
    return `$${price.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  if (price >= 0.01) {
    return `$${price.toFixed(4)}`;
  }

  return `$${price.toFixed(8)}`;
}

function formatCompact(value: number): string {
  if (!Number.isFinite(value)) {
    return "$0";
  }

  if (value >= 1_000_000_000_000) {
    return `$${(value / 1_000_000_000_000).toFixed(2)}T`;
  }

  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2)}B`;
  }

  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }

  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(2)}K`;
  }

  return `$${value.toFixed(2)}`;
}

function formatChange(change: number): string {
  if (!Number.isFinite(change)) {
    return "0.00%";
  }

  return `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`;
}

function getChangeClass(change: number): string {
  return change >= 0 ? "positive" : "negative";
}

function getInitials(symbol: string): string {
  return symbol.substring(0, 4).toUpperCase();
}

function isFavorite(id: string): boolean {
  return favorites.some((coin) => coin.id === id);
}

function updateLastUpdate(): void {
  if (!lastUpdate) {
    return;
  }

  lastUpdate.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
}

// ==========================================
// Local Storage
// ==========================================

function loadFavorites(): FavoriteCoin[] {
  try {
    const saved = localStorage.getItem(FAVORITES_KEY);

    if (!saved) {
      return [];
    }

    const parsed: unknown = JSON.parse(saved);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed as FavoriteCoin[];
  } catch {
    return [];
  }
}

function saveFavorites(): void {
  try {
    localStorage.setItem(
      FAVORITES_KEY,
      JSON.stringify(favorites)
    );
  } catch (error) {
    console.error("Unable to save favorites:", error);
  }
}

// ==========================================
// Binance API
// ==========================================

async function getBinanceTicker(
  symbol: string
): Promise<BinanceTicker> {
  const response = await fetch(
    `${BINANCE_API}/ticker/24hr?symbol=${symbol}`
  );

  if (!response.ok) {
    throw new Error(`Binance API error: ${response.status}`);
  }

  return (await response.json()) as BinanceTicker;
}

// ==========================================
// Load Live Prices
// ==========================================

async function loadLivePrices(): Promise<void> {
  if (!cryptoContainer) {
    return;
  }

  cryptoContainer.innerHTML = `
    <div class="top10-loading">
      Loading live cryptocurrency prices...
    </div>
  `;

  try {
    const results = await Promise.allSettled(
      liveCoins.map(async (coin) => {
        const ticker = await getBinanceTicker(coin.symbol);

        return {
          ...coin,
          price: Number(ticker.lastPrice),
          change24h: Number(ticker.priceChangePercent),
        };
      })
    );

const successfulCoins = results
  .filter(
    (
      result
    ): result is PromiseFulfilledResult<LiveCoin> =>
      result.status === "fulfilled"
  )
  .map((result) => result.value);
  const bitcoin = successfulCoins.find(
  (coin) => coin.symbol === "BTCUSDT"
);

if (bitcoin) {
  updateBitcoinChart(bitcoin.price);
}

    if (successfulCoins.length === 0) {
      cryptoContainer.innerHTML = `
        <div class="top10-error">
          Unable to load live prices.
          Please check your internet connection.
        </div>
      `;
      return;
    }

    cryptoContainer.innerHTML = successfulCoins
      .map((coin) => {
        const favorite = isFavorite(coin.symbol);

        return `
          <article class="crypto-card">

            <button
            type="button"
              class="watch-btn ${
                favorite ? "is-favorite" : ""
              }"
              data-live-favorite="${escapeHtml(coin.symbol)}"
              title="Add to favorites"
            >
              ${favorite ? "★" : "☆"}
            </button>

            <div class="coin-info">

              <div class="coin-icon">
                ${escapeHtml(coin.short)}
              </div>

              <div>
                <h3>${escapeHtml(coin.name)}</h3>
                <span>${escapeHtml(coin.short)}</span>
              </div>

            </div>

            <div class="coin-price">
              ${formatPrice(coin.price)}
            </div>

            <div class="coin-change ${getChangeClass(
              coin.change24h
            )}">
              ${formatChange(coin.change24h)}
            </div>

          </article>
        `;
      })
      .join("");

    document
      .querySelectorAll<HTMLButtonElement>(
        "[data-live-favorite]"
      )
      .forEach((button) => {
        button.addEventListener("click", () => {
          const symbol = button.dataset.liveFavorite;

          if (!symbol) {
            return;
          }

          const coin = successfulCoins.find(
            (item) => item.symbol === symbol
          );

          if (!coin) {
            return;
          }

          toggleLiveFavorite(coin);
        });
      });

    updateLastUpdate();
  } catch (error) {
    console.error("Live price error:", error);

    cryptoContainer.innerHTML = `
      <div class="top10-error">
        Unable to load live cryptocurrency prices.
      </div>
    `;
  }
}

// ==========================================
// Live Favorite Toggle
// ==========================================

function toggleLiveFavorite(coin: LiveCoin): void {
  const existingIndex = favorites.findIndex(
    (item) => item.id === coin.symbol
  );

  if (existingIndex >= 0) {
    favorites.splice(existingIndex, 1);
  } else {
    favorites.push({
      id: coin.symbol,
      name: coin.name,
      symbol: coin.short,
      price: coin.price,
      change24h: coin.change24h,
    });
  }

  saveFavorites();

  renderFavorites();

  loadLivePrices();
}

// ==========================================
// CoinPaprika API
// ==========================================

async function getTopCoins(): Promise<CryptoCoin[]> {
  const response = await fetch(
    `${PAPRIKA_API}/tickers?quotes=USD`
  );

  if (!response.ok) {
    throw new Error(
      `CoinPaprika API error: ${response.status}`
    );
  }

  const data: unknown = await response.json();

  if (!Array.isArray(data)) {
    throw new Error("Invalid CoinPaprika response");
  }

  const coins: CryptoCoin[] = data
    .map((item: any): CryptoCoin => ({
      id: String(item.id ?? ""),
      name: String(item.name ?? ""),
      symbol: String(item.symbol ?? ""),
      rank: Number(item.rank ?? 0),
      price: Number(
        item.quotes?.USD?.price ?? 0
      ),
      change24h: Number(
        item.quotes?.USD?.percent_change_24h ?? 0
      ),
      marketCap: Number(
        item.quotes?.USD?.market_cap ?? 0
      ),
      volume24h: Number(
        item.quotes?.USD?.volume_24h ?? 0
      ),
    }))
    .filter(
      (coin) =>
        coin.id &&
        coin.name &&
        coin.rank > 0
    )
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 100);

  return coins;
}

// ==========================================
// Render Top 10
// ==========================================

function renderTop10(coins: CryptoCoin[]): void {
  if (!top10Container) {
    return;
  }

  if (coins.length === 0) {
    top10Container.innerHTML = `
      <div class="top10-error">
        No cryptocurrency data available.
      </div>
    `;
    return;
  }

  top10Container.innerHTML = coins
    .slice(0, 10)
    .map((coin) => {
      const favorite = isFavorite(coin.id);

      return `
        <article class="crypto-card top10-card">

          <button
          type="button"
            class="watch-btn ${
              favorite ? "is-favorite" : ""
            }"
            data-favorite-id="${escapeHtml(coin.id)}"
            title="Add to favorites"
          >
            ${favorite ? "★" : "☆"}
          </button>

          <div class="coin-rank">
            #${coin.rank}
          </div>

          <div class="coin-info">

            <div class="coin-icon">
              ${escapeHtml(
                getInitials(coin.symbol)
              )}
            </div>

            <div>
              <h3>${escapeHtml(coin.name)}</h3>
              <span>
                ${escapeHtml(coin.symbol)}
              </span>
            </div>

          </div>

          <div class="coin-price">
            ${formatPrice(coin.price)}
          </div>

          <div class="coin-change ${getChangeClass(
            coin.change24h
          )}">
            ${formatChange(coin.change24h)}
          </div>

          <div class="coin-market-cap">
            Market Cap:
            ${formatCompact(coin.marketCap)}
          </div>

        </article>
      `;
    })
    .join("");

  document
    .querySelectorAll<HTMLButtonElement>(
      "[data-favorite-id]"
    )
    .forEach((button) => {
      button.addEventListener("click", () => {
        const id = button.dataset.favoriteId;

        if (!id) {
          return;
        }

        const coin = top10Coins.find(
          (item) => item.id === id
        );

        if (!coin) {
          return;
        }

        toggleTop10Favorite(coin);
      });
    });
}

// ==========================================
// Top 10 Favorite
// ==========================================

function toggleTop10Favorite(
  coin: CryptoCoin
): void {
  const existingIndex = favorites.findIndex(
    (item) => item.id === coin.id
  );

  if (existingIndex >= 0) {
    favorites.splice(existingIndex, 1);
  } else {
    favorites.push({
      id: coin.id,
      name: coin.name,
      symbol: coin.symbol,
      price: coin.price,
      change24h: coin.change24h,
    });
  }

  saveFavorites();

  renderFavorites();

  renderTop10(
    getFilteredTop10()
  );
}

// ==========================================
// Search
// ==========================================

function getFilteredTop10(): CryptoCoin[] {
  const searchValue =
    searchInput?.value.trim().toLowerCase() ?? "";

  if (!searchValue) {
    return top10Coins;
  }

  return top10Coins.filter((coin) => {
    return (
      coin.name.toLowerCase().includes(searchValue) ||
      coin.symbol.toLowerCase().includes(searchValue)
    );
  });
}

function setupSearch(): void {
  if (!searchInput) {
    return;
  }

  searchInput.addEventListener("input", () => {
    renderTop10(getFilteredTop10());
  });
}

// ==========================================
// Top Gainers
// ==========================================

function renderTopGainers(): void {
  if (!topGainers) {
    return;
  }

  const gainers = [...top10Coins]
    .sort(
      (a, b) => b.change24h - a.change24h
    )
    .slice(0, 5);

  topGainers.innerHTML = gainers
    .map(
      (coin) => `
        <div class="market-item">

          <div>
            <strong>
              ${escapeHtml(coin.symbol)}
            </strong>

            <small>
              ${escapeHtml(coin.name)}
            </small>
          </div>

          <span class="positive">
            ${formatChange(coin.change24h)}
          </span>

        </div>
      `
    )
    .join("");
}

// ==========================================
// Top Losers
// ==========================================

function renderTopLosers(): void {
  if (!topLosers) {
    return;
  }

  const losers = [...top10Coins]
    .sort(
      (a, b) => a.change24h - b.change24h
    )
    .slice(0, 5);

  topLosers.innerHTML = losers
    .map(
      (coin) => `
        <div class="market-item">

          <div>
            <strong>
              ${escapeHtml(coin.symbol)}
            </strong>

            <small>
              ${escapeHtml(coin.name)}
            </small>
          </div>

          <span class="negative">
            ${formatChange(coin.change24h)}
          </span>

        </div>
      `
    )
    .join("");
}

// ==========================================
// Favorites
// ==========================================

function renderFavorites(): void {
  if (favoritesCount) {
    favoritesCount.textContent =
      String(favorites.length);
  }

  if (!favoritesContainer) {
    return;
  }

  if (favorites.length === 0) {
    favoritesContainer.innerHTML = `
      <div class="favorites-empty">
        No favorite coins yet.
      </div>
    `;

    return;
  }

  favoritesContainer.innerHTML = favorites
    .map(
      (coin) => `
        <article class="crypto-card">

          <button
          type=""
            class="watch-btn is-favorite"
            data-remove-favorite="${escapeHtml(
              coin.id
            )}"
            title="Remove from favorites"
          >
            ★
          </button>

          <div class="coin-info">

            <div class="coin-icon">
              ${escapeHtml(
                getInitials(coin.symbol)
              )}
            </div>

            <div>
              <h3>
                ${escapeHtml(coin.name)}
              </h3>

              <span>
                ${escapeHtml(coin.symbol)}
              </span>
            </div>

          </div>

          <div class="coin-price">
            ${formatPrice(coin.price)}
          </div>

          <div class="coin-change ${getChangeClass(
            coin.change24h
          )}">
            ${formatChange(coin.change24h)}
          </div>

        </article>
      `
    )
    .join("");

  document
    .querySelectorAll<HTMLButtonElement>(
      "[data-remove-favorite]"
    )
    .forEach((button) => {
      button.addEventListener("click", () => {
        const id =
          button.dataset.removeFavorite;

        if (!id) {
          return;
        }

        removeFavorite(id);
      });
    });
}

function removeFavorite(id: string): void {
  favorites = favorites.filter(
    (coin) => coin.id !== id
  );

  saveFavorites();

  renderFavorites();

  renderTop10(
    getFilteredTop10()
  );

  loadLivePrices();
}

// ==========================================
// Market Sentiment
// ==========================================

function renderMarketSentiment(): void {
  if (!marketSentiment) {
    return;
  }

  if (top10Coins.length === 0) {
    marketSentiment.textContent =
      "Market data unavailable";

    return;
  }

  const positive = top10Coins.filter(
    (coin) => coin.change24h >= 0
  ).length;

  const percentage =
    (positive / top10Coins.length) * 100;

  if (percentage >= 70) {
    marketSentiment.textContent =
      "🟢 Bullish";
  } else if (percentage >= 50) {
    marketSentiment.textContent =
      "🟡 Neutral";
  } else {
    marketSentiment.textContent =
      "🔴 Bearish";
  }
}

// ==========================================
// Bitcoin Chart
// ==========================================

function drawBitcoinChart(): void {
  if (!bitcoinCanvas) {
    return;
  }

  const context =
    bitcoinCanvas.getContext("2d");

  if (!context) {
    return;
  }

  const width = bitcoinCanvas.width;
  const height = bitcoinCanvas.height;

  context.clearRect(
    0,
    0,
    width,
    height
  );

  if (bitcoinPrices.length < 2) {
    return;
  }

  const minPrice =
    Math.min(...bitcoinPrices);

  const maxPrice =
    Math.max(...bitcoinPrices);

  const range =
    maxPrice - minPrice || 1;

  context.beginPath();

  bitcoinPrices.forEach(
    (price, index) => {
      const x =
        (index /
          (bitcoinPrices.length - 1)) *
        width;

      const y =
        height -
        ((price - minPrice) / range) *
          (height - 20) -
        10;

      if (index === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    }
  );

  context.strokeStyle =
    "#f7931a";

  context.lineWidth = 3;

  context.stroke();
}

function updateBitcoinChart(
  bitcoinPrice: number
): void {
  if (!Number.isFinite(bitcoinPrice)) {
    return;
  }

  // Create initial market-like history
  if (bitcoinPrices.length === 0) {
    let price = bitcoinPrice;

    for (let i = 0; i < 20; i++) {
      const movement = (Math.random() - 0.5) * 0.012;
      price = price * (1 + movement);
      bitcoinPrices.push(price);
    }
  }

  // Add current live price
  bitcoinPrices.push(bitcoinPrice);

  // Keep only latest 50 points
  if (bitcoinPrices.length > 50) {
    bitcoinPrices.shift();
  }

  drawBitcoinChart();
}

// ==========================================
// CSV Export
// ==========================================

function exportTop10Csv(): void {
  if (top10Coins.length === 0) {
    alert("No cryptocurrency data available.");
    return;
  }

  const header = [
    "Rank",
    "Name",
    "Symbol",
    "Price",
    "24h Change",
    "Market Cap",
    "24h Volume",
  ];

  const rows = top10Coins.map(
    (coin) => [
      coin.rank,
      coin.name,
      coin.symbol,
      coin.price,
      coin.change24h,
      coin.marketCap,
      coin.volume24h,
    ]
  );

  const csv = [
    header,
    ...rows,
  ]
    .map((row) =>
      row
        .map((value) => {
          const text = String(value);

          return `"${text.replaceAll(
            '"',
            '""'
          )}"`;
        })
        .join(",")
    )
    .join("\n");

  const blob = new Blob(
    [csv],
    {
      type: "text/csv;charset=utf-8;",
    }
  );

  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.href = url;
  link.download =
    "cryptotrack-top10.csv";

  document.body.appendChild(link);

  link.click();

  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

// ==========================================
// Load Top 10 Data
// ==========================================

async function loadTop10(): Promise<void> {
  if (top10Container) {
    top10Container.innerHTML = `
      <div class="top10-loading">
        Loading top cryptocurrencies...
      </div>
    `;
  }

  try {
    top10Coins = await getTopCoins();

    renderTop10(
      getFilteredTop10()
    );

    renderTopGainers();

    renderTopLosers();

    renderMarketSentiment();

    updateLastUpdate();

    const bitcoin =
      top10Coins.find(
        (coin) =>
          coin.symbol.toUpperCase() === "BTC"
      );

    if (bitcoin) {
      updateBitcoinChart(
        bitcoin.price
      );
    }
  } catch (error) {
    console.error(
      "Top 10 loading error:",
      error
    );

    if (top10Container) {
      top10Container.innerHTML = `
        <div class="top10-error">
          Unable to load cryptocurrency data.
          Please try again.
        </div>
      `;
    }
  }
}

// ==========================================
// Refresh Everything
// ==========================================

async function refreshAll(): Promise<void> {
  await Promise.all([
    loadLivePrices(),
    loadTop10(),
  ]);
}

// ==========================================
// Event Listeners
// ==========================================

if (refreshBtn) {
  refreshBtn.addEventListener(
    "click",
    () => {
      refreshAll();
    }
  );
}

if (top10RefreshBtn) {
  top10RefreshBtn.addEventListener(
    "click",
    () => {
      loadTop10();
    }
  );
}

if (exportCsvBtn) {
  exportCsvBtn.addEventListener(
    "click",
    () => {
      exportTop10Csv();
    }
  );
}

setupSearch();

// ==========================================
// Initial Render
// ==========================================

renderFavorites();

refreshAll();