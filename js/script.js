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

let skillDataSets = {};

async function readCSVFiles() {
	SlickLoader.enable();

	let csvLoadingPromises = [];

	SKILLS.forEach((skill, i) => {
		csvLoadingPromises.push(
			new Promise((resolve, error) => {
				Plotly.d3.csv(
					`./resources/${skill}Rankings.csv`,
					function (d) {
						return {
							username: d.username,
							score: +d.score,
							percentile: +d.percentile,
						};
					},
					function (error, data) {
						skillDataSets[skill] = data;
						resolve();
					}
				);
			})
		);
	});

	// set last update subheading text
	csvLoadingPromises.push(
		fetch(`./resources/OverallRankings.csv`).then((r) => {
			document.getElementById("lastUpdated").innerHTML =
				"Data last updated on " + r.headers.get("Last-Modified");
		})
	);

	// wait for all these async tasks to finish
	await Promise.all(csvLoadingPromises);

	// set up autocomplete
	if (!autocompleteInitialized) {
		autocomplete(
			document.getElementById("playerHighlightInput"),
			skillDataSets["Overall"].map((row) => row.username)
		);
	}

	// now initial load is complete, we can render the graph
	recalculateGraph();
}

async function recalculateGraph() {
	SlickLoader.enable();

	// grab latest data from inputs
	updateInputsData();

	// process scores, bins + highlighted player
	let scoreEntries = skillDataSets[skill].filter(
		(row) => row.score >= minScore && row.score <= maxScore
	);
	let binData = calculateBins(scoreEntries);
	let highlightedPlayerData = calculateHighlightedPlayerInfo(scoreEntries, binData);

	// pass along all this info into graph
	MakeGraph(scoreEntries, binData, highlightedPlayerData);
}

function calculateBins(scoreEntries) {
	let currentBin = minScore + binSize;
	let scoresInBin = 0;
	let binData = [];

	// scores in ascending order, go through them and make bin each time we hit new binsize
	for (var i = 0; i < scoreEntries.length; i++) {
		scoresInBin++;

		while (Math.round(scoreEntries[i].score * 1000000) >= Math.round(currentBin * 1000000)) {
			binData.push({
				size: currentBin,
				percentile: scoreEntries[Math.max(0, i - 1)].percentile,
				scoresInBin: scoresInBin,
			});

			currentBin += binSize;
			scoresInBin = 0;
		}
	}

	// add last element since we won't hit it in loop
	binData.push({
		size: currentBin,
		percentile: scoreEntries[scoreEntries.length - 1].percentile,
		scoresInBin: scoresInBin,
	});

	return binData;
}

function calculateHighlightedPlayerInfo(scoreEntries, binData) {
	let playerToHighlight = null;
	let highlightedScoreEntry = scoreEntries.find((score) => score.username == highlightedPlayerName);

	if (highlightedScoreEntry) {
		let binIndex = 0;

		for (binIndex; binIndex < binData.length; binIndex++) {
			if (binData[binIndex].size > highlightedScoreEntry.score) {
				break;
			}
		}

		playerToHighlight = {
			name: highlightedScoreEntry.username,
			score: highlightedScoreEntry.score,
			binIndex: binIndex,
			barHeight: binData[binIndex].scoresInBin,
			percentile: highlightedScoreEntry.percentile,
		};
	}

	return playerToHighlight;
}

function MakeGraph(scoreData, binData, playerToHighlight) {
	// plotly specific data processing
	let scores = scoreData.map((entry) => entry.score);
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

	// set up and style everything outside of the bars themselves
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
	Plotly.newPlot("plotlyChart", data, layout, { responsive: true }).then((result) => {
		SlickLoader.disable();
	});
}

readCSVFiles();
