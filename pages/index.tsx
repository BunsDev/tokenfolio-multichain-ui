import type { NextPage } from "next";
import { useState, useEffect } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useNetwork, useSendTransaction } from "wagmi";
import axios from "axios";
import Slider from "rc-slider";
import Image from "next/image";

import tokenfolioLogo from "../public/tokenfoliologo.png";

import "rc-slider/assets/index.css";

const Home: NextPage = () => {
  const [apiBaseUrl, setApiBaseUrl] = useState("");
  const [swapTransaction, setSwapTransaction] = useState({ from: "", to: "", data: "", value: "", gasPrice: "" });
  const [sliderValues, setSliderValues] = useState<any>({});
  const [totalPercent, setTotalPercent] = useState(100);

  const { data: account } = useAccount();
  const { activeChain } = useNetwork();

  const { data, isIdle, isError, isLoading, isSuccess, sendTransaction } = useSendTransaction({
    request: {
      from: swapTransaction.from,
      to: swapTransaction.to,
      value: swapTransaction.value,
      data: swapTransaction.data,
      gasPrice: swapTransaction.gasPrice,
    },
  });

  useEffect(() => {
    console.log("Use Effect: [account, activeChain]");

    if (!account) {
      console.log("Account is not set...");
      return;
    }

    if (!activeChain) {
      console.log("Active chain is not set...");
      return;
    }

    const fetchTokens = async () => {
      console.log("Fetching tokens..");

      const chainId = activeChain.id;
      setApiBaseUrl("https://api.1inch.io/v4.0/" + chainId);

      try {
        let response = await axios.get("https://openapi.debank.com/v1/user/token_list?id=" + account.address);
        const currentTokenBalances: any = Array.from(response.data.values()).filter((item: any) => item.chain === activeChain.network && item.is_core);
        const totalPorfolioValue = currentTokenBalances.reduce((accumulator: number, tokenObj: any) => {
          return accumulator + tokenObj.price * tokenObj.amount;
        }, 0);

        let index = 0;
        let newSliderValues = {} as any;

        for (let token of currentTokenBalances) {
          let tokenEquity = token.price * token.amount;

          let sliderPercent = (tokenEquity / totalPorfolioValue) * 100;
          let sliderKey = "slider-key-" + index;

          newSliderValues[sliderKey] = {
            sliderPercent: sliderPercent,
            symbol: token.optimized_symbol || token.display_symbol || token.symbol,
            originalSliderPercent: sliderPercent,
            address: token.id,
            rawAmount: token.raw_amount,
            amount: token.amount,
            price: token.price,
            logo_url: token.logo_url,
          };

          index++;
        }

        setSliderValues(newSliderValues);

        console.log(response.data);
        console.log({ sliderValues });
      } catch (error) {
        console.error(error);
      }
    };

    fetchTokens();
  }, [account, activeChain]);

  useEffect(() => {
    console.log("Use Effect: [swapTransaction]");
    const swap = async () => {
      try {
        sendTransaction();
      } catch (error) {
        console.error(error);
      }
    };

    if (swapTransaction.to.length > 1) {
      console.log("Swapping");
      swap();
    } else {
      console.log("Not Swapping");
    }
  }, [swapTransaction]);

  const computeAndMakeTrade = async () => {
    let bucketsToSell = [];
    let bucketsToBuy = [];

    let coinsToSell = [];
    let coinsToBuy = [];
    let coinToSellAmount = "0";

    for (let key in sliderValues) {
      if (sliderValues[key].sliderPercent > sliderValues[key].originalSliderPercent) {
        // console.log(sliderValues[key].originalSliderPercent);
        // console.log(sliderValues[key].sliderPercent);
        // console.log(sliderValues[key].amount);
        // console.log(sliderValues[key].price);

        let currentUsdAmount = sliderValues[key].amount * sliderValues[key].price;
        let totalAmountUsd = (sliderValues[key].sliderPercent / sliderValues[key].originalSliderPercent) * currentUsdAmount;

        sliderValues[key].usdBuyOrSell = totalAmountUsd - currentUsdAmount;
        coinsToBuy.push(sliderValues[key]);
      }

      if (sliderValues[key].sliderPercent < sliderValues[key].originalSliderPercent) {
        sliderValues[key].usdBuyOrSell = (1 - sliderValues[key].sliderPercent / sliderValues[key].originalSliderPercent) * (sliderValues[key].amount * sliderValues[key].price);
        sliderValues[key].coinToSellAmount = "" + (1 - sliderValues[key].sliderPercent / sliderValues[key].originalSliderPercent) * sliderValues[key].rawAmount;
        coinsToSell.push(sliderValues[key]);
      }
    }

    // let trades = [];

    // for (let buyCoin of coinsToBuy) {
    //   let currentUsdAmountToBuy = buyCoin.usdBuyOrSell;

    //   //find match
    //   for (let sellCoin of coinsToSell) {
    //     if (sellCoin.usdBuyOrSell <= buyCoin.usdBuyOrSell) {
    //       trades.push({coinToSell:sellCoin, coinToBuy:buyCoin, coinToSellAmount: coin});
    //     }
    //   }
    // }

    // for(let trade of trades) {
    //   await makeTrade(trade.coinToSell, trade.coinToBuy, coinToSellAmount);
    // }

    console.log({ coinsToSell });
    console.log({ coinsToBuy });

    makeTrade(coinsToSell[0].address, coinsToBuy[0].address, coinsToSell[0].coinToSellAmount);
  };

  const makeTrade = async (fromTokenAddress: string, toTokenAddress: string, amount: string) => {
    const sp = {
      fromTokenAddress: fromTokenAddress,
      toTokenAddress: toTokenAddress,
      amount: amount,
      fromAddress: account?.address,
      slippage: 1,
      disableEstimate: false,
      allowPartialFill: false,
    };

    console.log("Making Trade:");
    console.log({ sp });

    const swapTransaction = await buildTxForSwap(sp);

    setSwapTransaction(swapTransaction);
    console.log({ swapTransaction });
  };

  // Swap Helpers
  const buildTxForSwap = async (swapParams: object) => {
    const url = apiRequestUrl("/swap", swapParams);
    return fetch(url)
      .then((res) => res.json())
      .then((res) => res.tx);
  };

  const apiRequestUrl = (methodName: string, queryParams: any) => {
    console.log({ apiBaseUrl });
    const url = apiBaseUrl + methodName + "?" + new URLSearchParams(queryParams).toString();
    console.log({ url });
    return url;
  };

  // UI Functions
  const changeSlider = (index: string, newPercet: number | number[]) => {
    let newSliderValues = sliderValues;
    newSliderValues[index].sliderPercent = newPercet;
    setSliderValues(newSliderValues);

    let newPercent = 0;
    for (let sliderValue in newSliderValues) {
      newPercent += newSliderValues[sliderValue].sliderPercent;
    }

    setTotalPercent(newPercent);
  };

  return (
    <>
      <div className="py-6 justify-center text-center">
        <div className="flex justify-center">
          <ConnectButton />
        </div>
      </div>

      <div className="pt-24 mx-auto box-content w-2/3">
        <div className="flex -mx-2">
          <div className="w-1/3 px-2">
            <Image src={tokenfolioLogo} alt="Tokenfolio Logo" />
          </div>

          <div className="w-2/3 px-2">
            <div className="w-3/3 p-5">
              {Object.keys(sliderValues).map((key, index) => (
                <div className="flex flex-row">
                  <div className="basis-1/12">
                    <Image src={sliderValues[key].logo_url} alt="Coin Logo" width={"60px"} height={"60px"} />
                  </div>
                  <div className="pl-8 basis-10/12">
                    <p>{sliderValues[key].symbol}</p>
                    <Slider key={key} min={0} max={100} defaultValue={sliderValues[key].sliderPercent} onChange={(e: any) => changeSlider(key, e)} />
                  </div>
                  <div className="basis-1/12">
                    <p className="pl-8">{Math.round(sliderValues[key].sliderPercent)}</p>
                  </div>
                </div>
              ))}

              <div className="flex flex-row">
                <div className="basis-1/12"> </div>
                <div className="pl-8 basis-10/12">
                  <p>Total:</p>
                </div>
                <div className="basis-1/12">
                  <p>{Math.round(totalPercent)}%</p>
                </div>
              </div>

              <div className="flex flex-row">
                <div className="basis-1/3"></div>
                <div className="basis-1/3 justify-center">
                  <div className="pl-12">
                    {Math.round(totalPercent) == 100 ? (
                      <button
                        disabled={Math.round(totalPercent) == 100 ? false : true}
                        onClick={computeAndMakeTrade}
                        className="text-white font-semibold bg-blue-500 hover:bg-blue-700
                                    border-blue-700 border-b hover:border-indigo-900 
                                    transition-all px-6 py-2 rounded-full"
                      >
                        Rebalance
                      </button>
                    ) : (
                      <button
                        disabled={Math.round(totalPercent) == 100 ? false : true}
                        onClick={computeAndMakeTrade}
                        className="text-white font-semibold bg-blue-200 hover:bg-blue-300
                                    border-blue-300 border-b hover:border-indigo-900 
                                    transition-all px-6 py-2 rounded-full"
                      >
                        Rebalance
                      </button>
                    )}
                  </div>
                </div>
                <div className="basis-1/3"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
