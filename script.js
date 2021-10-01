let binSize = 1;
let allRows = [];

let binSizeInput = document.querySelector("#binSizeInput");
binSizeInput.addEventListener("change", onBinSizeChange);

function onBinSizeChange(e) {
  binSize = parseFloat(e.target.value);
  processData();
}

function readCSV() {
  console.log(window.location.pathname + window.location.search);
  Plotly.d3.csv("./etternaRatings.csv", function (data) {
    allRows = data;
    processData();
  });
}

function processData() {
  let currentBin = binSize;
  let binCount = 0;
  let totalBinPercentile = 0;

  let scores = [];
  let scoreCount = [];
  let binPercentiles = [];

  for (var i = 0; i < allRows.length; i++) {
    let row = allRows[i];
    let score = parseFloat(row["player_rating"]);
    scores.push(score);

    if (i == allRows.length - 1 || parseFloat(score) > parseFloat(currentBin)) {
      let avgPercentile = totalBinPercentile / binCount;
      binPercentiles.push(avgPercentile);
      scoreCount.push(binCount);
      binCount = 0;
      totalBinPercentile = 0;
      currentBin += binSize;
    }

    totalBinPercentile += parseFloat(row["overall_percentile"]);
    binCount++;
  }

  makePlotly(scores, scoreCount, binPercentiles);
}

function makePlotly(scores, scoreCount, binPercentiles) {
  var plotDiv = document.getElementById("plot");
  var trace = {
    x: scores,
    type: "histogram",
    text: binPercentiles,
    xbins: {
      size: binSize,
    },
    hovertemplate:
      "Num Players: %{y}<br>" +
      "Rating: %{x}<br>" +
      "Percentile: %{text:.2f}%<extra></extra>",
  };

  let data = [trace];

  var layout = {
    title: "Etterna overall rating distribution<br>last updated Oct 1 2021",
    xaxis: {
      title: {
        text: "Overall Rating",
      },
      dtick: 5,
    },
    yaxis: {
      title: {
        text: "Player Count",
      },
    },
  };

  Plotly.newPlot("myDiv", data, layout, { responsive: true });
}

readCSV();
