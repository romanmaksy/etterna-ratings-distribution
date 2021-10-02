let binSizeInput = document.querySelector("#binSizeInput");
binSizeInput.addEventListener("change", onBinSizeChange);

let skillSetSelect = document.querySelector("#skillSetSelect");
skillSetSelect.addEventListener("change", onSkillSetChange);

let binSize = parseFloat(binSizeInput.value);
let skill = skillSetSelect.value;
let allRows = [];

function onBinSizeChange(e) {
	binSize = parseFloat(e.target.value);
	processData();
}

function onSkillSetChange(e) {
	skill = e.target.value;
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

	// sort relevant scores ascending
	let allScores = allRows.map((row) => parseFloat(row[skill]));
	allScores.sort((a, b) => a - b);

	// calculate percentiles
	let percentiles = allScores.map((score) => percentRank(allScores, score) * 100);

	for (var i = 0; i < allScores.length; i++) {
		let score = allScores[i];
		scores.push(score);

		// add percentile text for each bin, including empty bins
		while (parseFloat(score.toFixed(2)) > parseFloat(currentBin.toFixed(2))) {
			binPercentiles.push(parseFloat(percentiles[i - 1]));
			currentBin += binSize;
		}
	}

	// add last element
	binPercentiles.push(100);
	makePlotly(scores, binPercentiles);
}

// Returns the percentile of the given value in a sorted numeric array.
function percentRank(arr, v) {
	if (typeof v !== "number") throw new TypeError("v must be a number");
	for (var i = 0, l = arr.length; i < l; i++) {
		if (v <= arr[i]) {
			while (i < l && v === arr[i]) i++;
			if (i === 0) return 0;
			if (v !== arr[i - 1]) {
				i += (v - arr[i - 1]) / (arr[i] - arr[i - 1]);
			}
			return i / l;
		}
	}
	return 1;
}

function makePlotly(scores, binPercentiles) {
	var playerToHighlight = {
		name: "miracle7",
		rating: 15.47,
	};

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
		marker: {
			color: "rgba(100, 100, 200, .9)",
			line: {
				width: 1,
			},
		},
	};

	let data = [trace];

	var layout = {
		autosize: true,
		height: 600,
		margin: {
			l: 50,
			r: 50,
			b: 50,
			t: 0,
			pad: 0,
		},
		xaxis: {
			title: {
				text: `${skillSetSelect[skillSetSelect.selectedIndex].text} rating`,
			},
			dtick: 5,
		},
		yaxis: {
			title: {
				text: "Player Count",
			},
		},
		paper_bgcolor: "rgba(0,0,0,0)",
		plot_bgcolor: "rgba(0,0,0,0)",
		font: {
			color: "white",
		},
	};

	Plotly.newPlot("plotlyChart", data, layout, { responsive: true });
}

readCSV();
