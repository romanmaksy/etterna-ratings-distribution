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

let fullDataSet = [];

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
				lastActive: new Date(d.lastActive),
				country: d.country,
			};
		},
		function (error, data) {
			fullDataSet = data;

			// set up autocomplete
			if (!listsInitialized) {
				populateSelect("skillSetSelect", SKILLS);
				populateSelect(
					"countryInput",
					fullDataSet
						.map((row) => row.country)
						.filter(onlyUnique)
						.sort()
				);
				autocomplete(
					document.getElementById("playerHighlightInput"),
					fullDataSet.map((row) => row.username).filter(onlyUnique)
				);
				listsInitialized = true;
			}
			recalculateGraph();
		}
	);

	// set last update subheading text
	fetch(`./resources/csv/EtternaUserData.csv`).then((r) => {
		document.getElementById("lastUpdated").innerHTML =
			"last data fetched on " + r.headers.get("Last-Modified").slice(0, -13);
	});
}

function recalculateGraph() {
	SlickLoader.enable();

	// grab latest data from inputs
	updateInputsData();

	// process scores, bins + highlighted player
	let processedDataSet = getProcessedDataSet();
	if (processedDataSet.length == 0) {
		SlickLoader.disable();
		alert("no results for these filters - graph will not be updated");
		return;
	}

	let binData = calculateBins(processedDataSet);
	let highlightedPlayerData = calculateHighlightedPlayerInfo(processedDataSet, binData);

	// pass along all this info into graph
	MakeGraph(processedDataSet, binData, highlightedPlayerData);
}

function getProcessedDataSet() {
	let processedDataSet = fullDataSet.slice(0);

	// filter rows by score range
	processedDataSet = processedDataSet.filter(
		(row) => row[skill] >= minScore && row[skill] <= maxScore
	);

	// filter rows by date, filtering epoch dates or dates that are clearly too far in the future
	if (!isNaN(activeAfter)) {
		earliestDate = new Date("2000-01-01");
		latestDate = Date.now() + 7;
		processedDataSet = processedDataSet.filter(
			(row) =>
				row.lastActive > earliestDate &&
				row.lastActive < latestDate &&
				row.lastActive >= activeAfter
		);
	}

	// filter rows by country
	if (country != "") {
		processedDataSet = processedDataSet.filter((row) => row.country === country);
	}

	processedDataSet = processedDataSet.sort(function (a, b) {
		return a[skill] - b[skill];
	});

	scoresList = processedDataSet.map((row) => row[skill]);
	processedDataSet.forEach((row) => (row.percentile = 100 * percentRank(scoresList, row[skill])));

	return processedDataSet;
}

function calculateBins(processedDataSet) {
	if (processedDataSet.length == 0) return [];

	let currentBin = minScore + binSize;
	let scoresInBin = 0;
	let binData = [];

	// scores in ascending order, go through them and make bin each time we hit new binsize
	for (var i = 0; i < processedDataSet.length; i++) {
		while (Math.round(processedDataSet[i][skill] * 1000000) >= Math.round(currentBin * 1000000)) {
			binData.push({
				size: currentBin,
				percentile: i == 0 ? 0 : processedDataSet[i - 1].percentile,
				scoresInBin: scoresInBin,
			});

			currentBin += binSize;
			scoresInBin = 0;
		}

		scoresInBin++;
	}

	// add last element since we won't hit it in loop
	binData.push({
		size: currentBin,
		percentile: processedDataSet[processedDataSet.length - 1].percentile,
		scoresInBin: scoresInBin,
	});

	// remove first empty bins beacuse plotly ignores empty bins before first datapoint for some reason
	let index = binData.findIndex((bin) => bin.scoresInBin > 0);
	if (index > 0) binData = binData.slice(index);

	return binData;
}

function calculateHighlightedPlayerInfo(processedDataSet, binData) {
	let playerToHighlight = null;
	let highlightedScoreEntry = processedDataSet.find((row) => row.username == highlightedPlayerName);

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
			text: binData.map((bin) => bin.percentile),
			xbins: {
				start: minScore,
				size: binSize,
				end: binData[binData.length - 1].size,
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
			range: [minScore, binData[binData.length - 1].size * 1.05],
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

	annotations.push({
		xref: "paper",
		yref: "paper",
		x: 1,
		xanchor: "right",
		y: 1,
		yanchor: "top",
		text: `total players: ${scores.length}`,
		showarrow: false,
		font: {
			color: "white",
			size: 12,
		},
	});

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
			ax: playerToHighlight.score + 0.025 * binSize * binData.length,
			ay: playerToHighlight.barHeight + tallestBinHeight * 0.1,
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

function onlyUnique(value, index, self) {
	return self.indexOf(value) === index;
}

readCSVFiles();
