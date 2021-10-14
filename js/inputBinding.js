let minScoreInput = document.getElementById("minScoreInput");
minScoreInput.addEventListener("change", onInputsChanged);

let maxScoreInput = document.getElementById("maxScoreInput");
maxScoreInput.addEventListener("change", onInputsChanged);

let binSizeInput = document.getElementById("binSizeInput");
binSizeInput.addEventListener("change", onInputsChanged);

let skillSetSelect = document.getElementById("skillSetSelect");
skillSetSelect.addEventListener("change", onInputsChanged);

let showMedianInput = document.getElementById("showMedianInput");
showMedianInput.addEventListener("change", onInputsChanged);

let showAverageInput = document.getElementById("showAverageInput");
showAverageInput.addEventListener("change", onInputsChanged);

let playerHighlightInput = document.getElementById("playerHighlightInput");
playerHighlightInput.addEventListener("change", onInputsChanged);

let activeAfterInput = document.getElementById("activeAfterInput");
activeAfterInput.addEventListener("change", onInputsChanged);

let isMobile = window.matchMedia("only screen and (max-width: 760px)").matches;

if (!isMobile) showMedianInput.checked = true;

let showMedian = showMedianInput.checked;
let showAverage = showAverageInput.checked;
let highlightedPlayerName = playerHighlightInput.value;
let binSize = parseFloat(binSizeInput.value);
let skill = skillSetSelect.value;
let minScore = minScoreInput.value;
let maxScore = maxScoreInput.value;
let activeAfter = activeAfterInput.value;

function onInputsChanged(e) {
	recalculateGraph();
}

function updateInputsData() {
	showMedian = showMedianInput.checked;
	showAverage = showAverageInput.checked;
	highlightedPlayerName = playerHighlightInput.value;
	binSize = Math.max(0.01, parseFloat(binSizeInput.value || 0.5));
	binSizeInput.value = binSize;
	skill = skillSetSelect.value;
	minScore = Math.max(0, parseFloat(minScoreInput.value || 0));
	minScoreInput.value = minScore;
	maxScore = Math.max(minScore + 0.01, parseFloat(maxScoreInput.value || 40));
	maxScoreInput.value = maxScore;
	activeAfter = new Date(activeAfterInput.value);
}
