// control binding - TODO: make some generic binder function to avoid duplicate boilerplate
let playerHighlightInput = document.querySelector("#playerHighlightInput");
playerHighlightInput.addEventListener("change", onPlayerHighlightChange);

let binSizeInput = document.querySelector("#binSizeInput");
binSizeInput.addEventListener("change", onBinSizeChange);

let skillSetSelect = document.querySelector("#skillSetSelect");
skillSetSelect.addEventListener("change", onSkillSetChange);

let highlightedPlayerName = playerHighlightInput.value;
let binSize = parseFloat(binSizeInput.value);
let skill = skillSetSelect.value;
let allRows = [];

function onPlayerHighlightChange(e) {
	highlightedPlayerName = e.target.value;
	processData();
}

function onBinSizeChange(e) {
	binSize = parseFloat(e.target.value);
	processData();
}

function onSkillSetChange(e) {
	skill = e.target.value;
	processData();
}

// control binding end

async function readCSV() {
	SlickLoader.enable();

	// wrap load in timeout to make it async
	Plotly.d3.csv("./etternaRatings.csv", function (data) {
		allRows = data;
		processData();
	});
}

function processData() {
	SlickLoader.enable();

	let currentBin = binSize;
	let scoresPerBin = [];
	let binScoreCount = 0;
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
		binScoreCount++;

		// add percentile text for each bin, including empty bins
		while (parseFloat(score.toFixed(2)) > parseFloat(currentBin.toFixed(2))) {
			binPercentiles.push(parseFloat(percentiles[i - 1]));
			currentBin += binSize;
			scoresPerBin.push(binScoreCount);
			binScoreCount = 0;
		}
	}

	// add last element
	binPercentiles.push(100);
	scoresPerBin.push(binScoreCount);

	// attempt to get info for highlighted player
	let playerToHighlight = null;
	if ((playerRow = allRows.find((row) => row["formatted username"] == highlightedPlayerName))) {
		let score = parseFloat(playerRow[skill]);
		let binIndex = Math.floor(score / binSize);
		playerToHighlight = {
			name: highlightedPlayerName,
			score: score,
			binIndex: binIndex,
			barHeight: scoresPerBin[binIndex],
		};
	}

	makePlotly(
		scores,
		binPercentiles,
		playerToHighlight,
		Math.max(...scores),
		Math.max(...scoresPerBin)
	);
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

function makePlotly(scores, binPercentiles, playerToHighlight, highestScore, highestBin) {
	let colors = [];

	for (var i = 0; i < binPercentiles.length; i++) {
		if (playerToHighlight && i == playerToHighlight.binIndex) colors.push("rgba(100, 100, 230, 1)");
		else colors.push("rgba(100, 100, 200, .95)");
	}

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
			color: colors,
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
			range: [0, highestScore + highestScore * 0.15],
		},
		yaxis: {
			title: {
				text: "Player Count",
			},
			range: [0, highestBin + highestBin * 0.15],
		},
		paper_bgcolor: "rgba(0,0,0,0)",
		plot_bgcolor: "rgba(0,0,0,0)",
		font: {
			color: "white",
		},
	};

	if (playerToHighlight) {
		layout.annotations = [
			{
				text: `user: ${playerToHighlight.name}<br>${
					skillSetSelect[skillSetSelect.selectedIndex].text
				} rating: ${playerToHighlight.score.toFixed(2)}`,
				align: "left",
				bgcolor: "rgb(20,20,20)",
				x: playerToHighlight.score,
				y: playerToHighlight.barHeight,
				ax: playerToHighlight.score + binSize * 4,
				ay: playerToHighlight.barHeight + 100 * binSize,
				axref: "x",
				ayref: "y",
				arrowcolor: "rgb(200, 200, 200)",
				font: { size: 12 },
				borderwidth: 1,
				arrowsize: 1,
				arrowwidth: 1,
			},
		];
	}

	Plotly.newPlot("plotlyChart", data, layout, { responsive: true });
	SlickLoader.disable();
}

readCSV();
