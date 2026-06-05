const categorySlugMap = {
  VISKAS: "viskas",
  LIETUVIŠKI: "lietuviski",
  FILMAI: "filmai",
  SPORTAS: "sportas",
  MUZIKA: "muzika",
  VAIKAMS: "vaikams",
  DOKUMENTIKA: "dokumentika",
  UKRAINA: "ukraina",
  TOP: "top",
};

const categoryMap = {
  VISKAS: [],
  LIETUVIŠKI: ["Lietuviški", "Lietuvių kalba"],
  FILMAI: [
    "Filmai",
    "Komedijos",
    "Dramos",
    "Romantiniai",
    "Trileriai",
    "Fantastiniai",
    "Veiksmo",
    "Kriminalai",
    "Filmai ir pramogos",
    "Mistika",
    "Nuotykių",
    "Siaubo",
  ],
  SPORTAS: [
    "Sportas",
    "Futbolas",
    "Krepšinis",
    "Tenisas",
    "Formulė 1",
    "Beisbolas",
    "Golf",
    "UFC",
    "Smiginis",
  ],
  MUZIKA: ["Muzikiniai", "Muzika"],
  VAIKAMS: ["Vaikams", "Animacija", "Animaciniai"],
  DOKUMENTIKA: ["Dokumentika", "Dokumentiniai", "Gamtos"],
  UKRAINA: [],
  TOP: [],
};

let channels = {};
let programmes = [];
let selectedDate = null;
let selectedCategory = "VISKAS";
let searchQuery = "";

function setSelectedDate(date) {
  selectedDate = date;
}

function parseEPGDate(str) {
  const datePart = str.split(" ")[0];

  const y = +datePart.substr(0, 4);
  const m = +datePart.substr(4, 2) - 1;
  const d = +datePart.substr(6, 2);
  const h = +datePart.substr(8, 2);
  const min = +datePart.substr(10, 2);
  const s = +datePart.substr(12, 2);

  return new Date(y, m, d, h, min, s);
}

function getNowProgrammeIndex(prgs) {
  const now = new Date();

  for (const [i, prg] of prgs.entries()) {
    const start = parseEPGDate(prg.start);
    const stop = parseEPGDate(prg.stop);

    if (now >= start && now < stop) {
      return i;
    }
  }

  return -1;
}

function syncCategories(category) {
  const categoryUpper = category.toUpperCase();

  document.querySelectorAll(".nav a").forEach((link) => {
    link.classList.remove("active");

    if (link.dataset.cat?.toUpperCase() === categoryUpper) {
      link.classList.add("active");
    }
  });

  document.querySelectorAll(".categories-nav .cat").forEach((button) => {
    button.classList.remove("active");

    if (button.dataset.cat?.toUpperCase() === categoryUpper) {
      button.classList.add("active");
    }
  });
}

function centerActiveCategory(category) {
  const container = document.querySelector("#categories-nav");

  if (!container) return;

  const activeButton = container.querySelector(`[data-cat="${category}"]`);

  if (!activeButton) return;

  setTimeout(() => {
    const scrollLeft =
      activeButton.offsetLeft -
      container.clientWidth / 2 +
      activeButton.offsetWidth / 2;

    container.scroll({
      left: Math.max(0, scrollLeft),
      behavior: "smooth",
    });
  }, 50);
}

const finalEpgUrl = typeof epgUrl !== "undefined" ? epgUrl : "epg.xml";

fetch(finalEpgUrl)
  .then((res) => {
    if (!res.ok) {
      throw new Error("EPG neįkeltas");
    }

    return res.text();
  })
  .then((xmlText) => {
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlText, "text/xml");

    xml.querySelectorAll("channel").forEach((ch) => {
      const id = ch.getAttribute("id");

      channels[id] = {
        id,
        name:
          ch.querySelector('display-name[lang="lt"]')?.textContent?.trim() ||
          ch.querySelector("display-name")?.textContent?.trim() ||
          "",

        icon: ch.querySelector("icon")?.getAttribute("src") || "",
      };
    });

    programmes = [...xml.querySelectorAll("programme")].map((prg) => {
      const channel = prg.getAttribute("channel");
      const start = prg.getAttribute("start");
      const stop = prg.getAttribute("stop");

      const title =
        prg.querySelector('title[lang="lt"]')?.textContent?.trim() || "";

      const desc =
        prg.querySelector('desc[lang="lt"]')?.textContent?.trim() || "";

      const date = start.split(" ")[0].substring(0, 8);

      const icon = prg.querySelector("icon")?.getAttribute("src") || "";

      const categories = [...prg.querySelectorAll('category[lang="lt"]')].map(
        (c) => c.textContent.trim(),
      );

      return {
        channel,
        start,
        stop,
        title,
        desc,
        date,
        icon,
        categories,
      };
    });

    if (typeof renderDaysNavDayMenu !== "undefined") {
      renderDaysNavDayMenu(programmes);
    }

    renderChannels();
    syncCategories(selectedCategory);
    centerActiveCategory(selectedCategory);

    document
      .querySelector("#categories-nav")
      ?.addEventListener("click", (e) => {
        const btn = e.target.closest(".cat");
        if (!btn) return;

        selectedCategory = btn.dataset.cat;
        syncCategories(selectedCategory);
        centerActiveCategory(selectedCategory);
        renderChannels();
      });

    document.querySelector(".nav")?.addEventListener("click", (e) => {
      const link = e.target.closest("a");
      if (!link) return;

      selectedCategory = link.dataset.cat;
      syncCategories(selectedCategory);
      centerActiveCategory(selectedCategory);
      renderChannels();
    });

    document.querySelector("#epg-search")?.addEventListener("input", (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      renderChannels();
    });
  })
  .catch(console.error);

function renderChannels() {
  const container = document.querySelector("#channels");
  if (!container) return;
  container.innerHTML = "";

  const selectedSlug = categorySlugMap[selectedCategory];
  const activeChannelGroups =
    typeof channelGroups !== "undefined" ? channelGroups : {};

  // Pasiimame tos kategorijos masyvą iš config.js (jei nėra, naudojame 'viskas')
  const allowedChannelIds = selectedSlug
    ? activeChannelGroups[selectedSlug]
    : activeChannelGroups["viskas"];
  if (!allowedChannelIds) return;

  const channelMap = {};

  programmes.forEach((prg) => {
    if (selectedDate && prg.date !== selectedDate) {
      return;
    }

    if (!allowedChannelIds.includes(prg.channel)) {
      return;
    }

    if (searchQuery) {
      const ch = channels[prg.channel] || {};
      const searchableText = [prg.title, prg.desc, ch.name, ...prg.categories]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (!searchableText.includes(searchQuery)) {
        return;
      }
    }

    if (!channelMap[prg.channel]) {
      channelMap[prg.channel] = [];
    }
    channelMap[prg.channel].push(prg);
  });

  // Sukame ciklą pagal config.js nustatytą masyvo eiliškumą
  allowedChannelIds.forEach((chId) => {
    // Jei kanalas neturi programų pasirinktai dienai ar pagal paiešką – jo nerodome
    if (!channelMap[chId] || channelMap[chId].length === 0) return;

    const ch = channels[chId] || {};
    const prgs = channelMap[chId];

    prgs.sort((a, b) => a.start.localeCompare(b.start));

    const nowIndex = getNowProgrammeIndex(prgs);
    let html = "";

    prgs.forEach((prg, index) => {
      const open = index === nowIndex ? " open" : "";

      html += `
      <div class="program">
        <div class="program-time">
          ${prg.start.substr(8, 2)}:${prg.start.substr(10, 2)}
        </div>
        <button class="program-title-btn${open}" type="button" data-prg="${chId}_${index}">
          ${prg.title}
        </button>
      </div>
      <div class="program-desc${open}" id="desc-${chId}_${index}">
      ${
        prg.icon
          ? `<div class="program-image">
              <img src="${prg.icon}">
             </div>`
          : ""
      }
      ${prg.desc}
      </div>
      `;
    });

    const section = document.createElement("section");
    section.className = "channel";
    section.innerHTML = `
      <div class="channel-header">
        ${ch.icon ? `<img class="channel-icon" src="${ch.icon}">` : ""}
        <span>
          ${ch.name || chId}
        </span>
      </div>
      <div class="channel-underline"></div>
      ${html}
    `;

    container.append(section);
  });
}

document.addEventListener("click", (e) => {
  if (e.target.classList.contains("program-title-btn")) {
    const key = e.target.dataset.prg;
    const desc = document.getElementById("desc-" + key);

    e.target.classList.toggle("open");
    desc?.classList.toggle("open");
  }
});
