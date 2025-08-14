async function loadGamesData() {
	const candidates = [
		"games.json",
		"./games.json",
		"../games.json"
	];
	for (const path of candidates) {
		try {
			const res = await fetch(path, { cache: "no-store" });
			if (res.ok) {
				return await res.json();
			}
		} catch (e) {}
	}
	throw new Error("games.json not found");
}

async function loadExtraGamesData() {
	const candidates = [
		"games_extra.json",
		"./games_extra.json",
		"../games_extra.json"
	];
	for (const path of candidates) {
		try {
			const res = await fetch(path, { cache: "no-store" });
			if (res.ok) {
				return await res.json();
			}
		} catch (e) {}
	}
	return null;
}

function mergeGames(base, extra) {
	if (!extra) return base;
	const merged = { ...base };
	for (const platform of Object.keys(extra)) {
		// Wildcard: apply extras to every existing platform
		if (platform === "*") {
			for (const targetPlatform of Object.keys(merged)) {
				for (const genre of Object.keys(extra[platform])) {
					const extraList = extra[platform][genre] || [];
					const baseList = merged[targetPlatform][genre] || [];
					const set = new Set([...baseList, ...extraList]);
					merged[targetPlatform][genre] = Array.from(set);
				}
			}
			continue;
		}

		if (!merged[platform]) {
			merged[platform] = extra[platform];
			continue;
		}
		for (const genre of Object.keys(extra[platform])) {
			const extraList = extra[platform][genre] || [];
			const baseList = merged[platform][genre] || [];
			const set = new Set([...baseList, ...extraList]);
			merged[platform][genre] = Array.from(set);
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

(async function init() {
	const consoleSelect = document.getElementById("console");
	const genreSelect = document.getElementById("genre");
	const resultEl = document.getElementById("result");

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

document.getElementById("generate").addEventListener("click", () => {
			const selectedConsole = consoleSelect.value;
			const selectedGenre = genreSelect.value;
			const list = (games[selectedConsole] || {})[selectedGenre] || [];
			if (list.length > 0) {
				resultEl.innerHTML = `<h3>Suggested Game:</h3><p>${pickRandom(list)}</p>`;
    } else {
				resultEl.textContent = "No games available for this selection.";
			}
		});
	} catch (err) {
		if (resultEl) resultEl.textContent = "Failed to load game data.";
		// eslint-disable-next-line no-console
		console.error(err);
	}
})();


