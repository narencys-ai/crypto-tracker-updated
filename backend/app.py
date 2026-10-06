from flask import Flask, jsonify
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)


@app.route("/")
def home():
    return jsonify({
        "message": "CryptoTrack Backend is running!"
    })


@app.route("/api/prices")
def get_prices():
    try:
        url = "https://api.binance.com/api/v3/ticker/24hr"

        response = requests.get(url, timeout=10)
        response.raise_for_status()

        data = response.json()

        symbols = {
            "BTCUSDT": "Bitcoin",
            "ETHUSDT": "Ethereum",
            "SOLUSDT": "Solana"
        }

        result = []

        for item in data:
            symbol = item["symbol"]

            if symbol in symbols:
                result.append({
                    "name": symbols[symbol],
                    "symbol": symbol.replace("USDT", ""),
                    "price": float(item["lastPrice"]),
                    "change24h": float(item["priceChangePercent"])
                })

        return jsonify(result)

    except Exception as error:
        return jsonify({
            "error": str(error)
        }), 500

@app.route("/api/bitcoin-chart")
def bitcoin_chart():
    try:
        url = "https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=24"

        response = requests.get(url, timeout=10)
        response.raise_for_status()

        data = response.json()

        prices = []

        for item in data:
            prices.append(float(item[4]))

        return jsonify(prices)

    except Exception as e:
        return jsonify({"error": str(e)}), 500
if __name__ == "__main__":
    app.run(debug=True, port=5000)