// control binding - TODO: make some generic binder function to avoid duplicate boilerplate

let playerHighlightInput = document.querySelector("#playerHighlightInput");
//playerHighlightInput.addEventListener("change", onPlayerHighlightChange);

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

// called manually by autocomplete.js since normal event sometimes fires too early and get half a string??
function onPlayerHighlightChange(player) {
	highlightedPlayerName = player;
	processData();
}

function onBinSizeChange(e) {
	binSize = Math.max(0.01, parseFloat(e.target.value));
	binSizeInput.value = binSize;
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

async function processData() {
	SlickLoader.enable();

	let scoresPerBin = [];
	let binPercentiles = [];
	let binSizes = [];

	let binInfos = [];

	// transient vars
	let currentBin = binSize;
	let binScoreCount = 0;

	// get relevant scores from csv data
	let scoreData = allRows.map((row) => {
		return { name: row["formatted username"], score: parseFloat(row[skill]) };
	});

	// sort ascending
	scoreData = scoreData.sort(function (a, b) {
		return a.score - b.score;
	});

	let scores = scoreData.map((entry) => entry.score);

	// calculate percentiles
	scoreData.forEach((entry) => (entry.percentile = 100 * percentRank(scores, entry.score)));

	// calculate bins
	for (var i = 0; i < scoreData.length; i++) {
		binScoreCount++;

		// add percentile text for each bin, including empty bins
		while (
			Math.round(parseFloat(scoreData[i].score) * 100000) >
			Math.round(parseFloat(currentBin) * 100000)
		) {
			binInfos.push({
				size: currentBin,
				percentile: parseFloat(scoreData[i - 1].percentile),
				scoreCount: binScoreCount,
			});

			currentBin += binSize;
			binScoreCount = 0;
		}
	}

	// add last element
	binInfos.push({
		size: currentBin,
		percentile: parseFloat(scoreData[scoreData.length - 1].percentile),
		scoreCount: binScoreCount,
	});

	// attempt to get info for highlighted player
	let playerToHighlight = null;
	let highlightedPlayerData = scoreData.find((score) => score.name == highlightedPlayerName);

	if (highlightedPlayerData) {
		let binIndex = 0;

		for (binIndex; binIndex < binInfos.length; binIndex++) {
			if (binInfos[binIndex].size > highlightedPlayerData.score) {
				break;
			}
		}

		playerToHighlight = {
			name: highlightedPlayerData.name,
			score: highlightedPlayerData.score,
			binIndex: binIndex,
			barHeight: binInfos[binIndex].scoreCount,
			percentile: highlightedPlayerData.percentile,
		};
	}

	makePlotly(scoreData, binInfos, playerToHighlight);
}

function percentRank(arr, value) {
	for (let i = 0; i < arr.length; i++) {
		if (arr[i] === value) {
			return i / (arr.length - 1);
		}
	}

	// calculate value using linear interpolation
	let x1, x2, y1, y2;

	for (let i = 0; i < arr.length - 1; i++) {
		if (arr[i] < value && value < arr[i + 1]) {
			x1 = arr[i];
			x2 = arr[i + 1];
			y1 = percentRank(arr, x1);
			y2 = percentRank(arr, x2);
			return ((x2 - value) * y1 + (value - x1) * y2) / (x2 - x1);
		}
	}

	throw new Error("Out of bounds");
}

function makePlotly(scoreData, binInfos, playerToHighlight) {
	let scores = scoreData.map((entry) => entry.score);
	let highestScore = Math.max(...scores);
	let tallestBinHeight = Math.max(...binInfos.map((binInfo) => binInfo.scoreCount));
	let colors = [];
	for (var i = 0; i < binInfos.length; i++) {
		colors.push(playerToHighlight && i == playerToHighlight.binIndex ? "#7EC13E" : "#C13E7E");
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
				width: binSize > 0.1 ? 1 : 0,
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
			text: `Median: ${medianVal.toFixed(2)}`,
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
			text: `Average: ${avg.toFixed(2)}`,
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
		let displayText = `<b><i>${playerToHighlight.name}</i></b><br>${
			skillSetSelect[skillSetSelect.selectedIndex].text
		}: ${playerToHighlight.score.toFixed(2)}<br>Percentile: ${playerToHighlight.percentile.toFixed(
			2
		)}%`;

		annotations.push({
			text: displayText,
			align: "left",
			bgcolor: "rgba(0,0,0,.8)",
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

	Plotly.newPlot("plotlyChart", data, layout, { responsive: true }).then((result) => {
		SlickLoader.disable();
	});
}

readCSV();
