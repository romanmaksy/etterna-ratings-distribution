// control binding - TODO: make some generic binder function to avoid duplicate boilerplate
let playerHighlightInput = document.querySelector("#playerHighlightInput");
playerHighlightInput.addEventListener("change", onPlayerHighlightChange);

let binSizeInput = document.querySelector("#binSizeInput");
binSizeInput.addEventListener("change", onBinSizeChange);

let skillSetSelect = document.querySelector("#skillSetSelect");
skillSetSelect.addEventListener("change", onSkillSetChange);

let showMedianInput = document.querySelector("#showMedianInput");
showMedianInput.addEventListener("change", onShowMedianChange);

let showAverageInput = document.querySelector("#showAverageInput");
showAverageInput.addEventListener("change", onShowAverageChange);

let showMedian = showMedianInput.checked;
let showAverage = showAverageInput.checked;

let highlightedPlayerName = playerHighlightInput.value;
let binSize = parseFloat(binSizeInput.value);
let skill = skillSetSelect.value;
let allRows = [];

function onShowMedianChange(e) {
	showMedian = showMedianInput.checked;
	processData();
}

function onShowAverageChange(e) {
	showAverage = showAverageInput.checked;
	processData();
}

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

// colorMapping = {
// 	player_rating: {
// 		normal: "#7D6B91",
// 		highlight: "#7F916B",
// 	},
// 	Stream: {
// 		normal: "#7D6B91",
// 		highlight: "#7F916B",
// 	},
// 	Jumpstream: {
// 		normal: "#8481db",
// 		highlight: "#D8DB81",
// 	},
// 	Handstream: {
// 		normal: "#995fa3",
// 		highlight: "#69A35F",
// 	},
// 	Stamina: {
// 		normal: "#f2b5fa",
// 		highlight: "#BDFAB5",
// 	},
// 	JackSpeed: {
// 		normal: "#6c969d",
// 		highlight: "#9D736C",
// 	},
// 	Chordjack: {
// 		normal: "#a5f8d3",
// 		highlight: "#F8A5CA",
// 	},
// 	Technical: {
// 		normal: "#b0cec2",
// 		highlight: "#CEB0BC",
// 	},
// };

async function readCSV() {
	SlickLoader.enable();

	// wrap load in timeout to make it async
	Plotly.d3.csv("./etternaRatings.csv", function (data) {
		allRows = data;
		if (!autocompleteInitialized) {
			autocomplete(
				document.getElementById("playerHighlightInput"),
				allRows.map((row) => row["formatted username"])
			);
		}
		processData();
	});
}

function processData() {
	SlickLoader.enable();

	let scoresPerBin = [];
	let scores = [];
	let binPercentiles = [];
	let binSizes = [];

	let binInfos = [];

	// transient vars
	let currentBin = binSize;
	let binScoreCount = 0;

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
			binInfos.push({
				size: currentBin,
				percentile: parseFloat(percentiles[i - 1]),
				scoreCount: binScoreCount,
			});

			currentBin += binSize;
			binScoreCount = 0;
		}
	}

	// add last element
	binInfos.push({
		size: currentBin,
		percentile: parseFloat(percentiles[percentiles.length - 1]),
		scoreCount: binScoreCount,
	});

	// attempt to get info for highlighted player
	let playerToHighlight = null;
	let highlightedPlayerIndex = allRows.findIndex(
		(row) => row["formatted username"] == highlightedPlayerName
	);

	if (highlightedPlayerIndex >= 0) {
		let score = parseFloat(allRows[highlightedPlayerIndex][skill]);
		let binIndex = 0;

		for (binIndex; binIndex < binInfos.length; binIndex++) {
			if (binInfos[binIndex].size > score) {
				break;
			}
		}

		playerToHighlight = {
			name: highlightedPlayerName,
			score: score,
			binIndex: binIndex,
			barHeight: binInfos[binIndex].scoreCount,
			percentile: percentiles[highlightedPlayerIndex],
		};
	}

	makePlotly(scores, binInfos, playerToHighlight, Math.max(...scores));
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

function makePlotly(scores, binInfos, playerToHighlight, highestScore) {
	let tallestBinHeight = Math.max(...binInfos.map((binInfo) => binInfo.scoreCount));
	let colors = [];
	for (var i = 0; i < binInfos.length; i++) {
		colors.push(playerToHighlight && i == playerToHighlight.binIndex ? "#7F916B" : "#7D6B91");
	}

	var plotDiv = document.getElementById("plot");
	var trace = {
		x: scores,
		type: "histogram",
		text: binInfos.map((binInfo) => binInfo.percentile),
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
			range: [0, tallestBinHeight + tallestBinHeight * 0.15],
			gridcolor: "rgba(255,255,255,.1)",
			gridwidth: 3,
		},
		paper_bgcolor: "rgba(0,0,0,0)",
		plot_bgcolor: "rgba(0,0,0,0)",
		font: {
			color: "white",
		},
	};

	let annotations = [];

	const middle = Math.floor(scores.length / 2);
	let medianVal =
		scores.length % 2 === 0 ? (scores[middle - 1] + scores[middle]) / 2 : scores[middle];

	if (showMedian) {
		annotations.push({
			text: `median: ${medianVal.toFixed(2)}`,
			align: "left",
			bgcolor: "rgba(0,0,0,0)",
			x: medianVal,
			y: 0,
			ax: medianVal,
			ay: tallestBinHeight + tallestBinHeight * 0.05,
			axref: "x",
			ayref: "y",
			arrowcolor: "rgb(200, 200, 200)",
			font: { size: 12 },
			borderwidth: 1,
			arrowsize: 1,
			arrowwidth: 1,
		});
	}

	if (showAverage) {
		const sum = scores.reduce((a, b) => a + b, 0);
		const avg = sum / scores.length || 0;

		annotations.push({
			text: `avg: ${avg.toFixed(2)}`,
			align: "left",
			bgcolor: "rgba(0,0,0,0)",
			x: avg,
			y: 0,
			ax: avg,
			ay: tallestBinHeight + tallestBinHeight * 0.0,
			axref: "x",
			ayref: "y",
			arrowcolor: "rgb(200, 200, 200)",
			font: { size: 12 },
			borderwidth: 1,
			arrowsize: 1,
			arrowwidth: 1,
		});
	}

	if (playerToHighlight) {
		let displayText = `${playerToHighlight.name} - ${
			skillSetSelect[skillSetSelect.selectedIndex].text
		} rating: ${playerToHighlight.score.toFixed(
			2
		)}<br>percentile: ${playerToHighlight.percentile.toFixed(2)}%`;

		annotations.push({
			text: displayText,
			align: "left",
			bgcolor: "rgba(0,0,0,0)",
			x: playerToHighlight.score,
			y: playerToHighlight.barHeight,
			ax: playerToHighlight.score + binSize + 0.1 * binSize * binInfos.length,
			ay: playerToHighlight.barHeight + 50 * binSize,
			axref: "x",
			ayref: "y",
			arrowcolor: "rgb(200, 200, 200)",
			font: { size: 12 },
			borderwidth: 1,
			arrowsize: 1,
			arrowwidth: 1,
		});
	}

	layout.annotations = annotations;

	Plotly.newPlot("plotlyChart", data, layout, { responsive: true });
	SlickLoader.disable();
}

readCSV();
