async function loadGamesData() {
	const candidates = ["games.json", "./games.json", "../games.json"];
	for (const path of candidates) {
		try {
			const res = await fetch(path, { cache: "no-store" });
			if (res.ok) return await res.json();
		} catch (e) {}
	}
	throw new Error("games.json not found");
}

async function loadExtraGamesData() {
	const candidates = ["games_extra.json", "./games_extra.json", "../games_extra.json"];
	for (const path of candidates) {
		try {
			const res = await fetch(path, { cache: "no-store" });
			if (res.ok) return await res.json();
		} catch (e) {}
	}
	return null;
}

function mergeGames(base, extra) {
	if (!extra) return base;
	const merged = { ...base };
	for (const platform of Object.keys(extra)) {
		if (platform === "*") {
			for (const targetPlatform of Object.keys(merged)) {
				for (const genre of Object.keys(extra[platform])) {
					const extraList = extra[platform][genre] || [];
					const baseList = merged[targetPlatform][genre] || [];
					merged[targetPlatform][genre] = Array.from(new Set([...baseList, ...extraList]));
				}
			}
			continue;
		}
		if (!merged[platform]) { merged[platform] = extra[platform]; continue; }
		for (const genre of Object.keys(extra[platform])) {
			const extraList = extra[platform][genre] || [];
			const baseList = merged[platform][genre] || [];
			merged[platform][genre] = Array.from(new Set([...baseList, ...extraList]));
		}
	}
	return merged;
}

function populateSelect(selectElement, items) {
	selectElement.innerHTML = "";
	for (const value of items) {
		const opt = document.createElement("option");
		opt.value = value;
		opt.textContent = value;
		selectElement.appendChild(opt);
	}
}

function pickRandom(array) {
	return array[Math.floor(Math.random() * array.length)];
}

// Roll counter
let rollCount = 0;
// History
const rollHistory = [];

function updateRollCounter() {
	const el = document.getElementById('roll-counter');
	if (el) el.textContent = `ROLLS: ${rollCount}`;
}

function addToHistory(gameName) {
	rollHistory.unshift(gameName);
	if (rollHistory.length > 5) rollHistory.pop();

	const container = document.getElementById('history');
	if (!container) return;

	container.innerHTML = '';
	rollHistory.forEach((name, i) => {
		const chip = document.createElement('span');
		chip.style.cssText = `
			display: inline-block;
			padding: 3px 8px;
			background: rgba(255,191,0,${0.06 - i * 0.01});
			border: 1px solid rgba(255,191,0,${0.4 - i * 0.07});
			color: rgba(255,191,0,${1 - i * 0.15});
			font-family: 'Share Tech Mono', monospace;
			font-size: 10px;
			white-space: nowrap;
			max-width: 160px;
			overflow: hidden;
			text-overflow: ellipsis;
			cursor: default;
		`;
		chip.title = name;
		chip.textContent = name.length > 20 ? name.slice(0, 18) + '…' : name;
		container.appendChild(chip);
	});
}

// Rolling dice animation — cycles random game names rapidly before landing
function animateRoll(list, finalGame, onDone) {
	const resultEl = document.getElementById('result');
	if (!resultEl) { onDone(); return; }

	resultEl.className = 'result-card';
	resultEl.innerHTML = `
		<div class="text-center w-full">
			<div class="result-title mb-2">ROLLING<span class="dot1">.</span><span class="dot2">.</span><span class="dot3">.</span></div>
			<div id="roll-anim" style="
				font-family: 'Orbitron', sans-serif;
				font-size: clamp(12px, 2.5vw, 18px);
				font-weight: 900;
				color: #FF8000;
				text-shadow: 0 0 10px #FF8000;
				min-height: 30px;
				display: flex;
				align-items: center;
				justify-content: center;
			">—</div>
		</div>
	`;

	const animEl = document.getElementById('roll-anim');
	const shuffled = list.slice().sort(() => Math.random() - 0.5);
	let tick = 0;
	const totalTicks = 18;
	const interval = setInterval(() => {
		if (!animEl) { clearInterval(interval); return; }
		const sample = shuffled[tick % shuffled.length];
		animEl.textContent = sample.length > 26 ? sample.slice(0, 24) + '…' : sample;
		tick++;
		if (tick >= totalTicks) {
			clearInterval(interval);
			onDone();
		}
	}, 60);
}

function showResult(gameName) {
	const resultEl = document.getElementById('result');
	if (!resultEl) return;

	resultEl.className = 'result-card has-result';
	resultEl.innerHTML = `
		<div class="text-center w-full result-animate">
			<div class="result-title mb-3">★ SELECTED GAME ★</div>
			<div class="result-game-name">${gameName}</div>
			<div style="margin-top: 12px; display: flex; justify-content: center; gap: 6px;">
				<span style="font-family: 'Share Tech Mono', monospace; font-size: 10px;
					color: rgba(57,255,20,0.5);">GOOD LUCK, PLAYER!</span>
			</div>
		</div>
	`;
}

(async function init() {
	const consoleSelect = document.getElementById("console");
	const genreSelect = document.getElementById("genre");
	const resultEl = document.getElementById("result");
	const generateBtn = document.getElementById("generate");

	try {
		const base = await loadGamesData();
		const extra = await loadExtraGamesData();
		const games = mergeGames(base, extra);
		populateSelect(consoleSelect, Object.keys(games));

		function updateGenres() {
			const selectedConsole = consoleSelect.value;
			populateSelect(genreSelect, Object.keys(games[selectedConsole] || {}));
		}

		consoleSelect.addEventListener("change", updateGenres);
		updateGenres();

		generateBtn.addEventListener("click", () => {
			const selectedConsole = consoleSelect.value;
			const selectedGenre = genreSelect.value;
			const list = (games[selectedConsole] || {})[selectedGenre] || [];

			if (list.length === 0) {
				if (resultEl) {
					resultEl.className = 'result-card';
					resultEl.innerHTML = `
						<div class="text-center">
							<p style="font-family: 'Press Start 2P', cursive; font-size: 10px; color: #FF006E;">
								⚠ NO GAMES FOUND<br>
								<span style="font-size: 8px; opacity: 0.6; margin-top: 6px; display: block;">
									TRY A DIFFERENT COMBO
								</span>
							</p>
						</div>
					`;
				}
				return;
			}

			// Disable button during animation
			generateBtn.disabled = true;
			generateBtn.style.opacity = '0.5';
			const btnText = document.getElementById('btn-text');
			if (btnText) btnText.textContent = '⚙ ROLLING...';

			const chosen = pickRandom(list);

			animateRoll(list, chosen, () => {
				rollCount++;
				updateRollCounter();
				showResult(chosen);
				addToHistory(chosen);

				// Re-enable button
				generateBtn.disabled = false;
				generateBtn.style.opacity = '1';
				if (btnText) btnText.textContent = '⚡ ROLL THE DICE ⚡';
			});
		});

	} catch (err) {
		if (resultEl) {
			resultEl.innerHTML = `
				<p style="font-family: 'Press Start 2P', cursive; font-size: 10px; color: #FF006E;">
					FAILED TO LOAD GAME DATA
				</p>
			`;
		}
		console.error(err);
	}
})();
