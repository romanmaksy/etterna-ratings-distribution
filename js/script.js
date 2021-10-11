const SKILLS = [
	"Overall",
	"Stream",
	"Jumpstream",
	"Handstream",
	"Stamina",
	"Jacks",
	"Chordjacks",
	"Technical",
];

let userDataSet = [];

function readCSVFiles() {
	SlickLoader.enable();

	// load csv from file
	Plotly.d3.csv(
		`./resources/csv/EtternaUserData.csv`,
		function (d) {
			return {
				username: d.username,
				Overall: +d.Overall,
				Stamina: +d.Stamina,
				Stream: +d.Stream,
				Jumpstream: +d.Jumpstream,
				Handstream: +d.Handstream,
				Jacks: +d.Jacks,
				Chordjacks: +d.Chordjacks,
				Technical: +d.Technical,
			};
		},
		function (error, data) {
			userDataSet = data;

			// set up autocomplete
			if (!autocompleteInitialized) {
				autocomplete(
					document.getElementById("playerHighlightInput"),
					userDataSet.map((row) => row.username)
				);
			}

			recalculateGraph();
		}
	);

	// set last update subheading text
	fetch(`./resources/csv/EtternaUserData.csv`).then((r) => {
		document.getElementById("lastUpdated").innerHTML =
			"last data fetched on " + r.headers.get("Last-Modified").slice(0, -13);
	})
}

function recalculateGraph() {
	SlickLoader.enable();

	// grab latest data from inputs
	updateInputsData();

	// process scores, bins + highlighted player
	let processedDataSet = getProcessedDataSet()
	let binData = calculateBins(processedDataSet);
	let highlightedPlayerData = calculateHighlightedPlayerInfo(processedDataSet, binData);

	// pass along all this info into graph
	MakeGraph(processedDataSet, binData, highlightedPlayerData);
}

function getProcessedDataSet() {
	let processedDataSet = userDataSet.filter(
		(row) => row[skill] >= minScore && row[skill] <= maxScore
	);

	processedDataSet = processedDataSet.sort(function (a, b) {
		return a[skill] - b[skill];
	});

	scoresList = processedDataSet.map(row => row[skill])
	processedDataSet.forEach(row => row.percentile = 100 * percentRank(scoresList, row[skill]));

	return processedDataSet
}

function calculateBins(processedDataSet) {
	let currentBin = minScore + binSize;
	let scoresInBin = 0;
	let binData = [];

	// scores in ascending order, go through them and make bin each time we hit new binsize
	for (var i = 0; i < processedDataSet.length; i++) {
		scoresInBin++;

		while (Math.round(processedDataSet[i][skill] * 1000000) >= Math.round(currentBin * 1000000)) {
			binData.push({
				size: currentBin,
				percentile: processedDataSet[Math.max(0, i - 1)].percentile,
				scoresInBin: scoresInBin,
			});

			currentBin += binSize;
			scoresInBin = 0;
		}
	}

	// add last element since we won't hit it in loop
	binData.push({
		size: currentBin,
		percentile: processedDataSet[processedDataSet.length - 1].percentile,
		scoresInBin: scoresInBin,
	});

	return binData;
}

function calculateHighlightedPlayerInfo(processedDataSet, binData) {
	let playerToHighlight = null;
	let highlightedScoreEntry = processedDataSet.find(row => row.username == highlightedPlayerName);

	if (highlightedScoreEntry) {
		let binIndex = 0;

		for (binIndex; binIndex < binData.length; binIndex++) {
			if (binData[binIndex].size > highlightedScoreEntry[skill]) {
				break;
			}
		}

		playerToHighlight = {
			name: highlightedScoreEntry.username,
			score: highlightedScoreEntry[skill],
			binIndex: binIndex,
			barHeight: binData[binIndex].scoresInBin,
			percentile: highlightedScoreEntry.percentile,
		};
	}

	return playerToHighlight;
}

function MakeGraph(processedDataSet, binData, playerToHighlight) {
	// plotly specific data processing
	let scores = processedDataSet.map((entry) => entry[skill]);
	let highestScore = Math.max(...scores);
	let tallestBinHeight = Math.max(...binData.map((binInfo) => binInfo.scoresInBin));
	let colors = [];

	// set color of bars, changing color of bin highlighted player is in if found
	for (var i = 0; i < binData.length; i++) {
		colors.push(playerToHighlight && i == playerToHighlight.binIndex ? "#7EC13E" : "#C13E7E");
	}

	// set up data for plotly to render the bars
	let data = [
		{
			x: scores,
			type: "histogram",
			text: binData.map((binInfo) => binInfo.percentile),
			xbins: {
				start: 0,
				size: binSize,
			},
			hovertemplate:
				"Num Players: %{y}<br>" + "Rating: %{x}<br>" + "Percentile: %{text:.2f}%<extra></extra>",
			marker: {
				color: colors,
				line: {
					width: maxScore / binSize > 0.1 ? 1 : 0,
				},
			},
		},
	];

	let isMobile = window.matchMedia("only screen and (max-width: 760px)").matches;

	// set up and style everything outside of the bars themselves
	var layout = {
		autosize: true,
		height: isMobile ? 300 : 600,
		margin: {
			l: 50,
			r: isMobile ? 0 : 50,
			b: 50,
			t: 0,
			pad: 0,
		},
		xaxis: {
			title: {
				text: `${skillSetSelect[skillSetSelect.selectedIndex].text} rating`,
			},
			dtick: 5,
			range: [minScore, highestScore + highestScore * 0.15],
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
		dragmode: false,
	};

	// add average and median annotations if required
	let annotations = [];

	if (showMedian) {
		const middle = Math.floor(scores.length / 2);
		let medianVal =
			scores.length % 2 === 0 ? (scores[middle - 1] + scores[middle]) / 2 : scores[middle];

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

	// add annotation for highlighted player if required
	if (playerToHighlight) {
		let displayText = `<b><i>${playerToHighlight.name}</i></b><br>${skillSetSelect[skillSetSelect.selectedIndex].text
			}: ${playerToHighlight.score.toFixed(2)}<br>Percentile: ${playerToHighlight.percentile.toFixed(
				2
			)}%`;

		annotations.push({
			text: displayText,
			align: "left",
			bgcolor: "rgba(0,0,0,.8)",
			x: playerToHighlight.score,
			y: playerToHighlight.barHeight,
			ax: playerToHighlight.score + binSize + 0.1 * binSize * binData.length,
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

	// add all annotations to layout
	layout.annotations = annotations;

	// pass all data to plotly to render
	Plotly.newPlot("plotlyChart", data, layout, { responsive: true, staticPlot: isMobile }).then(
		(result) => {
			SlickLoader.disable();
		}
	);
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

readCSVFiles();
