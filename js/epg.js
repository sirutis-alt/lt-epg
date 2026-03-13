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

function getUniqueDates(programmes) {
  const dates = new Set();
  programmes.forEach((prg) => {
    if (prg.date) {
      dates.add(prg.date);
    }
  });
  return [...dates].sort();
}

function setSelectedDate(date) {
  selectedDate = date;
}

function formatDate(dateStr) {
  const months = [
    "sausio",
    "vasario",
    "kovo",
    "balandžio",
    "gegužės",
    "birželio",
    "liepos",
    "rugpjūčio",
    "rugsėjo",
    "spalio",
    "lapkričio",
    "gruodžio",
  ];
  const y = +dateStr.substr(0, 4);
  const m = +dateStr.substr(4, 2) - 1;
  const d = +dateStr.substr(6, 2);
  const dateObj = new Date(y, m, d);
  if (isNaN(dateObj)) {
    return dateStr;
  }
  const dayNameShort = new Intl.DateTimeFormat("lt-LT", { weekday: "short" })
    .format(dateObj)
    .replace(".", "");
  return `${dayNameShort}, ${dateObj.getDate()} ${
    months[dateObj.getMonth()]
  }, ${dateObj.getFullYear()}`;
}

function parseEPGDate(str) {
  const y = +str.substr(0, 4);
  const m = +str.substr(4, 2) - 1;
  const d = +str.substr(6, 2);
  const h = +str.substr(8, 2);
  const min = +str.substr(10, 2);
  const s = +str.substr(12, 2);
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
    if (link.dataset.cat && link.dataset.cat.toUpperCase() === categoryUpper) {
      link.classList.add("active");
    }
  });

  document.querySelectorAll(".categories-nav .cat").forEach((button) => {
    button.classList.remove("active");
    if (button.dataset.cat.toUpperCase() === categoryUpper) {
      button.classList.add("active");
    }
  });
}

function centerActiveCategory(category) {
  const container = document.querySelector("#categories-nav");
  if (!container) {
    return;
  }

  const activeButton = container.querySelector(
    `[data-cat="${category.toUpperCase()}"]`,
  );
  if (!activeButton) {
    return;
  }

  setTimeout(() => {
    const containerWidth = container.clientWidth;
    const buttonOffsetLeft = activeButton.offsetLeft;
    const buttonWidth = activeButton.offsetWidth;

    let scrollLeft = buttonOffsetLeft - containerWidth / 2 + buttonWidth / 2;

    if (scrollLeft < 0) {
      scrollLeft = 0;
    }
    const maxScroll = container.scrollWidth - containerWidth;
    if (scrollLeft > maxScroll) {
      scrollLeft = maxScroll;
    }

    container.scroll({
      left: scrollLeft,
      behavior: "smooth",
    });
  }, 50);
}

const finalEpgUrl = typeof epgUrl !== "undefined" ? epgUrl : "epg.xml";

fetch(finalEpgUrl)
  .then((res) => {
    if (!res.ok)
      throw new Error(
        `Nepavyko įkelti EPG iš ${finalEpgUrl}: ${res.statusText}`,
      );
    return res.text();
  })
  .then((xmlText) => {
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlText, "text/xml");

    xml.querySelectorAll("channel").forEach((ch) => {
      const id = ch.getAttribute("id");
      const name =
        ch.querySelector('display-name[lang="lt"]')?.textContent ||
        ch.querySelector("display-name")?.textContent ||
        "";
      const icon = ch.querySelector("icon")?.getAttribute("src") || "";
      channels[id] = { id, name, icon };
    });

    programmes = [...xml.querySelectorAll("programme")].map((prg) => {
      const channel = prg.getAttribute("channel");
      const start = prg.getAttribute("start");
      const stop = prg.getAttribute("stop");
      const title = prg.querySelector('title[lang="lt"]')?.textContent || "";
      const desc = prg.querySelector('desc[lang="lt"]')?.textContent || "";
      const date = start.substr(0, 8);
      const icon = prg.querySelector("icon")?.getAttribute("src") || "";
      const categories = [...prg.querySelectorAll('category[lang="lt"]')].map(
        (cat) => cat.textContent.trim(),
      );
      return { channel, start, stop, title, desc, date, icon, categories };
    });

    if (typeof renderDaysNavDayMenu !== "undefined") {
      renderDaysNavDayMenu(programmes);
    } else {
      const uniqueDates = getUniqueDates(programmes);
      selectedDate = uniqueDates[0];
    }

    renderChannels();

    syncCategories(selectedCategory);
    centerActiveCategory(selectedCategory);

    document
      .querySelector("#categories-nav")
      document.querySelector("#categories-nav")
      ?.addEventListener("click", (e) => {
        const targetButton = e.target.closest(".cat");
        if (targetButton) {
          selectedCategory = targetButton.dataset.cat;

          syncCategories(selectedCategory);
          centerActiveCategory(selectedCategory);

          renderChannels();
        }
      });

    document.querySelector(".nav")?.addEventListener("click", (e) => {
      const targetLink = e.target.closest("a");
      if (targetLink) {
        selectedCategory = targetLink.dataset.cat;

        syncCategories(selectedCategory);
        centerActiveCategory(selectedCategory);

        renderChannels();

        const burger = document.querySelector(".burger");
        const navElement = document.querySelector(".nav");

        if (burger && navElement && burger.classList.contains("active")) {
          burger.classList.remove("active");
          navElement.classList.remove("open");
        }
      }
    });

    document.querySelector("#epg-search")?.addEventListener("input", (e) => {
      searchQuery = e.target.value.trim();
      renderChannels();
    });
  })
  .catch((error) => {
    console.error("Klaida įkeliant arba apdorojant EPG duomenis:", error);
  });

function renderChannels() {
  // PATAISYMAS: Kiekvieną kartą perpiešiant kanalus, grįžtame į puslapio viršų
  window.scrollTo(0, 0);

  const container = document.querySelector("#channels");
  if (!container) {
    console.warn("#channels konteineris nerastas.");
    return;
  }
  container.innerHTML = "";

  const dateDiv = document.querySelector("#selected-date");
  if (dateDiv && selectedDate) {
    dateDiv.textContent = formatDate(selectedDate);
  }

  const activeChannelGroups =
    typeof channelGroups !== "undefined" ? channelGroups : {};
  const selectedSlug = categorySlugMap[selectedCategory];
  const allowedChannelIds = selectedSlug
    ? activeChannelGroups[selectedSlug]
    : null;

  let channelsToRender = [];
  channelsToRender =
    selectedSlug && allowedChannelIds
      ? [...allowedChannelIds]
      : Object.keys(channels);

  const channelMap = {};
  programmes.forEach((prg) => {
    if (prg.date !== selectedDate) {
      return;
    }
    if (
      selectedSlug &&
      allowedChannelIds &&
      !allowedChannelIds.includes(prg.channel)
    ) {
      return;
    }
    if (selectedCategory !== "VISKAS" && !selectedSlug) {
      const allowedCategories = categoryMap[selectedCategory] || [];
      if (allowedCategories.length > 0) {
        if (
          !prg.categories ||
          !prg.categories.some((cat) => allowedCategories.includes(cat))
        ) {
          return;
        }
      }
    }
    if (searchQuery) {
      const ch = channels[prg.channel] || {};
      const text = [prg.title, prg.desc, ch.name].join(" ").toLowerCase();
      if (!text.includes(searchQuery.toLowerCase())) {
        return;
      }
    }
    if (!channelMap[prg.channel]) {
      channelMap[prg.channel] = [];
    }
    channelMap[prg.channel].push(prg);
  });

  channelsToRender.forEach((chId) => {
    const prgs = channelMap[chId];
    if (!prgs || prgs.length === 0) {
      return;
    }

    const ch = channels[chId] || {};
    prgs.sort((a, b) => a.start.localeCompare(b.start));
    const nowIndex = getNowProgrammeIndex(prgs);

    let chIcon = ch.icon
      ? `<img src="${ch.icon}" alt="${ch.name}" class="channel-icon">`
      : "";
    let chName = ch.name || chId;

    let block = prgs
      .map((prg, index) => {
        const isOpen = index === nowIndex ? " open" : "";
        return `
        <div class="program">
          <div class="program-time">${prg.start.substr(8, 2)}:${prg.start.substr(10, 2)}</div>
          <button class="program-title-btn${isOpen}" type="button" data-prg="${chId}_${index}">${
            prg.title
          }</button>
        </div>
        <div class="program-desc${isOpen}" id="desc-${chId}_${index}">
          ${prg.icon ? `<div class="program-image"><img src="${prg.icon}" alt=""></div>` : ""}
          ${prg.desc ? prg.desc : ""}
        </div>
      `;
      })
      .join("");

    const section = document.createElement("section");
    section.className = "channel";
    section.innerHTML = `
      <div class="channel-header">
        ${chIcon}<span>${chName}</span>
      </div>
      <div class="channel-underline"></div>
      ${block}
    `;
    container.append(section);
  });
}

document.addEventListener("click", (e) => {
  if (e.target.classList.contains("program-title-btn")) {
    const key = e.target.dataset.prg;
    const desc = document.getElementById("desc-" + key);
    if (desc) {
      e.target.classList.toggle("open");
      desc.classList.toggle("open");
    }
  }
});
