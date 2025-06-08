let selectedTypes = [];
let caughtPokemon = [];
let caughtNamesONLY = [];
let allFilteredNames = [];
let currentBatchIndex = 0;
const batchSize = 20;
let isLoadingMore = false;
let isSearching = false;
let currentSearchToken = 0;

document.addEventListener("DOMContentLoaded", () => {
  fillTypes();
  fillAbilitySelect();
  document.getElementById("srchBtn").addEventListener("click", search_pokemon);
});

// Like Pokémon logic
document.addEventListener("click", (e) => {
  const likeButton = e.target.closest(".like-button");
  if (!likeButton) return;

  likeButton.classList.toggle("liked");

  const pokeball = document.getElementById("inventoryButton");
  pokeball.classList.add("shake-once");
  setTimeout(() => pokeball.classList.remove("shake-once"), 1500);

  const card = likeButton.closest(".poke-card");
  const id = card.querySelector("td:first-child").textContent;
  const name = card.querySelector("td:nth-child(2)").textContent;
  const abilities = card.querySelector("tr:nth-last-child(2)").textContent.replace("Ability: ", "");
  const entry = `${id} ${name} (${abilities})`;

  if (likeButton.classList.contains("liked")) {
    if (!caughtNamesONLY.includes(name)){
      caughtNamesONLY.push(name);
      caughtPokemon.push(entry);
    }
  } else {
    caughtPokemon = caughtPokemon.filter(p => p !== entry);
    caughtNamesONLY = caughtNamesONLY.filter(n => n !== name);


  }
  renderInventory();
});


function renderInventory() {
  const list = document.getElementById("inventoryList");
  list.innerHTML = "";
  caughtPokemon.forEach(p => {
    const li = document.createElement("li");
    li.textContent = p;
    list.appendChild(li);
  });
}

async function getTypes() {
  try {
    const res = await fetch("https://pokeapi.co/api/v2/type");
    return (await res.json()).results;
  } catch (err) {
    console.error("Error fetching types:", err);
    return [];
  }
}

async function getAbilities() {
  try {
    const res = await fetch("https://pokeapi.co/api/v2/ability?limit=367");
    return (await res.json()).results;
  } catch (err) {
    console.error("Error fetching abilities:", err);
    return [];
  }
}

async function fetchTypePokemon(type) {
  const res = await fetch(`https://pokeapi.co/api/v2/type/${type}`);
  const data = await res.json();
  return data.pokemon.map(p => p.pokemon.name);
}

async function fetchAbilityPokemon(ability) {
  const res = await fetch(`https://pokeapi.co/api/v2/ability/${ability}`);
  const data = await res.json();
  return data.pokemon.map(p => p.pokemon.name);
}

async function fillTypes() {
  const types = await getTypes();
  const left = document.getElementById("leftTypes");
  const right = document.getElementById("rightTypes");

  // cutting types stellar and unknown

  const filtered = types.filter(t => {
    const id = parseInt(t.url.split("/").slice(-2)[0]);
    console.log(id);
    return id < 19;
  });

  filtered.forEach((type, i) => {
    const btn = document.createElement("button");
    btn.classList.add("type-button");
    btn.textContent = type.name;
    btn.dataset.type = type.name;

    btn.onclick = () => {
      const t = btn.dataset.type;
      const index = selectedTypes.indexOf(t);
      if (index === -1) {
        selectedTypes.push(t);
        btn.classList.add("selected");
      } else {
        selectedTypes.splice(index, 1);
        btn.classList.remove("selected");
      }
    };

    (i < filtered.length / 2 ? left : right).appendChild(btn);
  });
}

async function fillAbilitySelect() {
  const abilities = await getAbilities();
  const select = document.getElementById("abilitySelect");
  abilities.forEach(({ name }) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  });
}

function buildCard(data) {
  const types = data.types.map(t => t.type.name).join(", ");
  const abilities = data.abilities.map(a => a.ability.name).join(", ");

  const id = `#${data.id}`;
  const name = data.name;
  const entry = `${id} ${name} (${abilities})`;
  const isLiked = caughtNamesONLY.includes(name) ? "liked" : "";

  const table = document.createElement("table");
  table.classList.add("poke-card");

  table.innerHTML = `
    <tr><th colspan="3">Image</th></tr>
    <tr>
      <td colspan="3">
        <img src="${data.sprites.other['official-artwork'].front_default}" alt="${name}" width="96" height="96" />
      </td>
    </tr>
    <tr><th>ID</th><th>Name</th><th>Type</th></tr>
    <tr><td>${id}</td><td>${name}</td><td>${types}</td></tr>
    <tr><td colspan="3">Ability: ${abilities}</td></tr>
    <tr>
      <td colspan="3">
        <div class="like-button ${isLiked}" data-id="${data.id}" title="Like">
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path d="M14.1 5.6A4.47 4.47 0 0 1 22 8.48V9c0 2.18-1.65 4.56-4.1 6.78a35 35 0 0 1-5.9 4.21 35 35 0 0 1-5.9-4.21C3.64 13.56 2 11.18 2 9v-.53a4.47 4.47 0 0 1 7.9-2.86L12 8.12z" fill="none" stroke="#666" stroke-width="2"/>
          </svg>
        </div>
      </td>
    </tr>
  `;

  return table;
}

//<tr><td colspan="3"><button>Catch</button></td></tr>
async function loadNextBatch(token = currentSearchToken) {
  if (isLoadingMore || token !== currentSearchToken) return;
  isLoadingMore = true;

  const resultArea = document.getElementById("resultArea");
  const loader = document.getElementById("loaderWrapper");
  loader.style.display = "block";

  const names = allFilteredNames.slice(currentBatchIndex, currentBatchIndex + batchSize);
  for (const name of names) {
    // token is a way to avoid mid-scroll bug;
    if (token !== currentSearchToken) {
      loader.style.display = "none";
      isLoadingMore = false;
      return;
    }


    try {
      const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${name}`);
      const data = await res.json();
      resultArea.appendChild(buildCard(data));
    } catch (e) {
      console.error(`Error loading ${name}:`, e);
    }
  }

  currentBatchIndex += batchSize;
  isLoadingMore = false;
  loader.style.display = "none";
}

window.addEventListener("scroll", () => {
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 200 &&
    currentBatchIndex < allFilteredNames.length) {
    loadNextBatch(currentSearchToken);
  }
});

async function filterAllPokemonByTypeAndAbility(selectedTypes, selectedAbility) {
  const resultArea = document.getElementById("resultArea");
  const loader = document.getElementById("loaderWrapper");

  resultArea.innerHTML = "";
  loader.style.display = "block";

  try {
    const typeSets = await Promise.all(selectedTypes.map(fetchTypePokemon));
    let filtered = typeSets.length ? intersectMany(typeSets) : [];

    if (selectedAbility) {
      const abilityList = await fetchAbilityPokemon(selectedAbility);
      filtered = filtered.length ? intersectArrays(filtered, abilityList) : abilityList;
    }

    allFilteredNames = filtered;
    currentBatchIndex = 0;

    if (!filtered.length) {
      resultArea.textContent = "No matching Pokémon found.";
    } else {
      await loadNextBatch();
    }
  } catch (err) {
    console.error("Filtering error:", err);
    resultArea.textContent = "Error occurred while filtering.";
  }

  loader.style.display = "none";
}

function intersectArrays(a, b) {
  return a.filter(x => b.includes(x));
}

function intersectMany(arrays) {
  return arrays.reduce(intersectArrays);
}

async function search_pokemon() {
  if (isSearching) return;
  isSearching = true;

  const searchBtn = document.getElementById("srchBtn");
  searchBtn.disabled = true;

  currentSearchToken++;

  const nameOrId = document.getElementById("name").value.trim().toLowerCase();
  const selectedAbility = document.getElementById("abilitySelect").value;

  if (nameOrId) {
    await fetchAndRenderPokemon(nameOrId, selectedTypes, selectedAbility);
  } else {
    await filterAllPokemonByTypeAndAbility(selectedTypes, selectedAbility);
  }

  searchBtn.disabled = false;
  isSearching = false;
}

async function fetchAndRenderPokemon(nameOrId, selectedTypes, selectedAbility) {
  const resultArea = document.getElementById("resultArea");
  const loader = document.getElementById("loaderWrapper");

  resultArea.innerHTML = "";
  loader.style.display = "block";

  try {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${nameOrId}`);
    if (!res.ok) throw new Error("Not found");

    const data = await res.json();
    const types = data.types.map(t => t.type.name);
    const abilities = data.abilities.map(a => a.ability.name);

    if (selectedTypes.length && !selectedTypes.every(t => types.includes(t))) {
      resultArea.textContent = "Pokémon does not match selected types.";
    } else if (selectedAbility && !abilities.includes(selectedAbility)) {
      resultArea.textContent = "Pokémon does not have selected ability.";
    } else {
      resultArea.appendChild(buildCard(data));
    }
  } catch (err) {
    resultArea.textContent = `Error: ${err.message}`;
  }

  loader.style.display = "none";
}

// Inventory preview hover
const wrapper = document.querySelector(".inventory-wrapper");
const preview = document.getElementById("inventoryPreview");
let hideTimeout;

wrapper.addEventListener("mouseenter", () => {
  clearTimeout(hideTimeout);
  preview.style.opacity = "1";
  preview.style.pointerEvents = "auto";
});

wrapper.addEventListener("mouseleave", () => {
  hideTimeout = setTimeout(() => {
    preview.style.opacity = "0";
    preview.style.pointerEvents = "none";
  }, 300);
});


