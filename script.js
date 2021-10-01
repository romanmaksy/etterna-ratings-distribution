let binSizeInput = document.querySelector("#binSizeInput");
binSizeInput.addEventListener("change", onBinSizeChange);

let binSize = parseFloat(binSizeInput.value);
let allRows = [];

function onBinSizeChange(e) {
	binSize = parseFloat(e.target.value);
	processData();
}

function readCSV() {
	Plotly.d3.csv("./etternaRatings.csv", function (data) {
		allRows = data;
		processData();
	});
}

function processData() {
	let currentBin = binSize;
	let scores = [];
	let binPercentiles = [];

	for (var i = 0; i < allRows.length; i++) {
		let row = allRows[i];
		let score = parseFloat(row["player_rating"]);
		scores.push(score);

		// add percentile text for each bin, including empty bins
		while (parseFloat(score.toFixed(2)) > parseFloat(currentBin.toFixed(2))) {
			binPercentiles.push(parseFloat(allRows[i - 1]["overall_percentile"]) * 100);
			currentBin += binSize;
		}
	}

	// add last element
	binPercentiles.push(100);
	makePlotly(scores, binPercentiles);
}

function makePlotly(scores, binPercentiles) {
	var plotDiv = document.getElementById("plot");
	var trace = {
		x: scores,
		type: "histogram",
		text: binPercentiles,
		xbins: {
			start: 0,
			size: binSize,
		},
		hovertemplate:
			"Num Players: %{y}<br>" + "Rating: %{x}<br>" + "Percentile: %{text:.2f}%<extra></extra>",
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
