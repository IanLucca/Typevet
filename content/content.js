(function mountTypevet() {
  "use strict";

  const ROOT_ID = "typevet-extension-root";
  const FAB_DRAG_THRESHOLD = 5;
  const PANEL_GAP = 10;
  const bootstrap = globalThis.TYPEVET_BOOTSTRAP || {};
  const injectedCssText = typeof bootstrap.cssText === "string" ? bootstrap.cssText : "";
  let openPanelRequested = bootstrap.openPanel === true;
  delete globalThis.TYPEVET_BOOTSTRAP;
  if (document.getElementById(ROOT_ID) || !globalThis.TYPEVET) return;

  const { STORAGE_KEYS, migrateStoredData, normalizeSearchText, matchesDescriptionSearch } = globalThis.TYPEVET;
  const {
    normalizeLanguage,
    t: translate,
    plural: translatePlural,
    localizeCategoryName,
    localizeOrganName,
    localizeDescription
  } = globalThis.TYPEVET_I18N;
  const state = {
    categories: [],
    organs: [],
    descriptions: [],
    settings: {},
    panelOpen: false,
    view: { name: "home", categoryId: null, organId: null, descriptionId: null },
    organReturnView: null,
    organSearchOrganId: null,
    organSearchQuery: "",
    quickAddReturnView: null,
    quickAddOrganId: null,
    toastTimer: null
  };

  const dragState = {
    pointerId: null,
    startX: 0,
    startY: 0,
    startLeft: 0,
    startTop: 0,
    moved: false,
    suppressClickUntil: 0
  };

  let host;
  let shadow;
  let panel;
  let panelTitle;
  let panelBody;
  let backButton;
  let floatingButton;
  let floatingButtonLabel;
  let quickAddFooterButton;
  let quickAddFooterLabel;
  let managerFooterLabel;
  let fabVisibilityButton;
  let fabVisibilityLabel;
  let languageButton;
  let closeButton;
  let toast;
  let resizeFrame = null;

  const escapeHtml = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), maximum);
  const currentLanguage = () => normalizeLanguage(state.settings.language);
  const tr = (key, values) => translate(currentLanguage(), key, values);
  const trPlural = (key, count, values) => translatePlural(currentLanguage(), key, count, values);
  const displayCategoryName = (category) => localizeCategoryName(category, currentLanguage());
  const displayOrganName = (organ) => localizeOrganName(organ, currentLanguage());
  const displayDescription = (description) => localizeDescription(description, currentLanguage());

  function iconSvg(name, size = 24) {
    const paths = {
      abdome: '<ellipse cx="12" cy="12" rx="7.5" ry="9"/><path d="M8 9.5c2.2-1.6 5.8-1.6 8 0M8.5 14.5c1.8 1.3 5.2 1.3 7 0"/>',
      cervical: '<path d="M9 4.5c0 2-1.2 3.4-2.4 4.8C5.5 10.6 5 12 5.5 14c.8 3 3.3 5 6.5 5s5.7-2 6.5-5c.5-2-.1-3.4-1.1-4.7C16.2 8 15 6.5 15 4.5"/><path d="M9 8.5h6M9.5 12h5M10 15.5h4"/>',
      ocular: '<path d="M2.8 12s3.3-5.2 9.2-5.2 9.2 5.2 9.2 5.2-3.3 5.2-9.2 5.2S2.8 12 2.8 12Z"/><circle cx="12" cy="12" r="3"/>',
      urinario: '<path d="M8.5 5.5c-2.7.8-4 3.1-3.7 6.2.2 2.5 1.8 4.7 4 5.5 1.4.5 2.2-.3 2.2-1.6V8.2c0-2.2-.8-3.2-2.5-2.7ZM15.5 5.5c2.7.8 4 3.1 3.7 6.2-.2 2.5-1.8 4.7-4 5.5-1.4.5-2.2-.3-2.2-1.6V8.2c0-2.2.8-3.2 2.5-2.7Z"/><path d="M9 18.2c.6 1 1.6 1.5 3 1.5s2.4-.5 3-1.5"/>',
      tireoide: '<path d="M7.2 6.2c-2.2 1-3.3 3.3-2.5 5.4.7 1.9 2.2 2.8 4.4 2.8H11V9.6C11 6.8 9.5 5.2 7.2 6.2ZM16.8 6.2c2.2 1 3.3 3.3 2.5 5.4-.7 1.9-2.2 2.8-4.4 2.8H13V9.6c0-2.8 1.5-4.4 3.8-3.4Z"/><path d="M11 14.4v3.2M13 14.4v3.2"/>',
      vascular: '<path d="M12 20V4M12 9 7 5M12 12l6-4M12 15l-5 4M12 17l4 3"/>',
      obstetricia: '<circle cx="12" cy="12" r="8"/><path d="M9 13c1.2 1.7 4.8 1.7 6 0M9.2 9.7h.1M14.7 9.7h.1"/>',
      library: '<path d="M4.5 5.5h6.2c.7 0 1.3.6 1.3 1.3V19c0-1-.8-1.8-1.8-1.8H4.5V5.5Z"/><path d="M19.5 5.5h-6.2c-.7 0-1.3.6-1.3 1.3V19c0-1 .8-1.8 1.8-1.8h5.7V5.5Z"/>',
      generic: '<circle cx="12" cy="12" r="8"/><path d="M8 12h8M12 8v8"/>'
    };

    return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.generic}</svg>`;
  }

  const uiIcons = {
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17"/></svg>',
    back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg>',
    copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="10" height="11" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h2"/></svg>',
    star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/></svg>',
    search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16 16 4 4"/></svg>',
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    visibility: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12s3.2-5 9-5 9 5 9 5-3.2 5-9 5-9-5-9-5Z"/><circle cx="12" cy="12" r="2.8"/></svg>',
    settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>'
  };

  async function getStoredData() {
    const keys = Object.values(STORAGE_KEYS);
    const stored = await chrome.storage.local.get(keys);
    const migrated = migrateStoredData(stored);

    if (migrated.didMigrate) {
      await chrome.storage.local.set({
        [STORAGE_KEYS.categories]: migrated.categories,
        [STORAGE_KEYS.organs]: migrated.organs,
        [STORAGE_KEYS.descriptions]: migrated.descriptions,
        [STORAGE_KEYS.settings]: migrated.settings
      });
    }

    return migrated;
  }

  async function loadData() {
    const data = await getStoredData();
    state.categories = data.categories;
    state.organs = data.organs;
    state.descriptions = data.descriptions;
    state.settings = data.settings;
  }

  function categoryById(id) {
    return state.categories.find((category) => category.id === id);
  }

  function organById(id) {
    return state.organs.find((organ) => organ.id === id);
  }

  function categoryForDescription(description) {
    return categoryById(organById(description?.organId)?.categoryId);
  }

  function descriptionById(id) {
    return state.descriptions.find((description) => description.id === id);
  }

  function orderedDescriptions(items) {
    return items
      .map(displayDescription)
      .sort((first, second) => first.title.localeCompare(second.title, currentLanguage()));
  }

  function recentDescriptions() {
    return [...state.descriptions]
      .filter((description) => description.lastUsedAt)
      .sort((first, second) => String(second.lastUsedAt).localeCompare(String(first.lastUsedAt)))
      .slice(0, 3);
  }

  function favoriteDescriptions() {
    return orderedDescriptions(state.descriptions.filter((description) => description.favorite)).slice(0, 4);
  }

  function renderQuickRow(description) {
    description = displayDescription(description);
    const rawOrgan = organById(description.organId);
    const rawCategory = categoryById(rawOrgan?.categoryId);
    const organName = rawOrgan ? displayOrganName(rawOrgan) : tr("common.noOrgan");
    const categoryName = rawCategory ? displayCategoryName(rawCategory) : tr("common.noCategory");
    return `
      <article class="sono-quick-row">
        <button class="sono-quick-main" data-action="detail" data-id="${escapeHtml(description.id)}" type="button">
          <span class="sono-mini-icon" style="--accent:${escapeHtml(rawCategory?.color || "#1f7a8c")}">
            ${iconSvg(rawCategory?.icon || "generic", 20)}
          </span>
          <span class="sono-quick-copy">
            <strong>${escapeHtml(description.title)}</strong>
            <small>${escapeHtml(organName)} · ${escapeHtml(categoryName)}</small>
          </span>
          <span class="sono-chevron">${uiIcons.chevron}</span>
        </button>
        <button class="sono-icon-button sono-copy-button" data-action="copy" data-id="${escapeHtml(description.id)}" type="button" title="${escapeHtml(tr("panel.copyTitle", { title: description.title }))}" aria-label="${escapeHtml(tr("panel.copyTitle", { title: description.title }))}">
          ${uiIcons.copy}
        </button>
      </article>`;
  }

  function renderCategoryCard(category) {
    const organs = state.organs.filter((organ) => organ.categoryId === category.id);
    const descriptionCount = state.descriptions.filter((description) =>
      organs.some((organ) => organ.id === description.organId)).length;
    const organLabel = trPlural("count.organ", organs.length);
    const descriptionLabel = trPlural("count.text", descriptionCount);

    return `
      <button class="sono-category-card" data-action="category" data-id="${escapeHtml(category.id)}" type="button" style="--accent:${escapeHtml(category.color || "#1f7a8c")}">
        <span class="sono-category-icon">${iconSvg(category.icon || "generic", 27)}</span>
        <span class="sono-category-name">${escapeHtml(displayCategoryName(category))}</span>
        <span class="sono-category-count">${organLabel} · ${descriptionLabel}</span>
      </button>`;
  }

  function renderLibraryCard() {
    const organLabel = trPlural("count.organ", state.organs.length);
    const descriptionLabel = trPlural("count.text", state.descriptions.length);

    return `
      <button class="sono-category-card sono-library-card" data-action="library" type="button" style="--accent:#2b7182">
        <span class="sono-category-icon">${iconSvg("library", 27)}</span>
        <span class="sono-category-name">${tr("common.library")}</span>
        <span class="sono-category-count">${organLabel} · ${descriptionLabel}</span>
      </button>`;
  }

  function renderHome() {
    const favorites = favoriteDescriptions();
    const recents = recentDescriptions().filter((recent) => !favorites.some((favorite) => favorite.id === recent.id));
    const hasQuickAccess = favorites.length || recents.length;

    return `
      <div class="sono-view sono-home-view">
        ${hasQuickAccess ? `
          <section class="sono-section">
            <div class="sono-section-heading">
              <div>
                <span class="sono-eyebrow">${tr("panel.quickAccess")}</span>
                <h3>${tr("panel.shortcuts")}</h3>
              </div>
            </div>
            <div class="sono-quick-list">
              ${favorites.map(renderQuickRow).join("")}
              ${recents.slice(0, Math.max(0, 4 - favorites.length)).map(renderQuickRow).join("")}
            </div>
          </section>` : `
          <button class="sono-tip" data-action="manager" type="button">
            <span class="sono-tip-star">${uiIcons.star}</span>
            <span><strong>${tr("panel.createShortcuts")}</strong><small>${tr("panel.markFavorites")}</small></span>
            <span class="sono-chevron">${uiIcons.chevron}</span>
          </button>`}

        <section class="sono-section sono-categories-section">
          <div class="sono-section-heading">
            <div>
              <span class="sono-eyebrow">${tr("panel.mouseNavigation")}</span>
              <h3>${tr("panel.chooseCategory")}</h3>
            </div>
            <span class="sono-total-badge">${state.descriptions.length}</span>
          </div>
          <div class="sono-category-grid">
            ${renderLibraryCard()}
            ${state.categories.map(renderCategoryCard).join("")}
          </div>
        </section>
      </div>`;
  }

  function renderDescriptionCard(description) {
    description = displayDescription(description);
    const excerpt = description.text.length > 96
      ? `${description.text.slice(0, 96).trim()}…`
      : description.text;

    return `
      <article class="sono-description-card" data-description-id="${escapeHtml(description.id)}">
        <button class="sono-description-main" data-action="detail" data-id="${escapeHtml(description.id)}" type="button">
          <span class="sono-description-title-line">
            <strong>${escapeHtml(description.title)}</strong>
            ${description.favorite ? `<span class="sono-favorite-mark" title="${tr("common.favorite")}">${uiIcons.star}</span>` : ""}
          </span>
          <span class="sono-description-excerpt">${escapeHtml(excerpt)}</span>
          ${description.isSample ? `<span class="sono-sample-tag">${tr("panel.sampleEdit")}</span>` : ""}
        </button>
        <div class="sono-description-actions">
          <button class="sono-secondary-button" data-action="detail" data-id="${escapeHtml(description.id)}" type="button">${tr("panel.viewText")}</button>
          <button class="sono-primary-icon-button" data-action="copy" data-id="${escapeHtml(description.id)}" type="button" title="${escapeHtml(tr("panel.copyTitle", { title: description.title }))}" aria-label="${escapeHtml(tr("panel.copyTitle", { title: description.title }))}">
            ${uiIcons.copy}
          </button>
        </div>
      </article>`;
  }

  function renderOrganCard(organ, category) {
    const descriptions = orderedDescriptions(
      state.descriptions.filter((description) => description.organId === organ.id)
    );
    const label = trPlural("count.description", descriptions.length);
    const preview = descriptions.slice(0, 2).map((description) => description.title).join(" · ");
    const organName = displayOrganName(organ);

    return `
      <button class="sono-organ-card" data-action="organ" data-id="${escapeHtml(organ.id)}" type="button" style="--accent:${escapeHtml(category.color || "#1f7a8c")}">
        <span class="sono-organ-icon">${iconSvg(category.icon || "generic", 23)}</span>
        <span class="sono-organ-content">
          <strong>${escapeHtml(organName)}</strong>
          <small>${escapeHtml(preview || tr("panel.noTextRegistered"))}</small>
        </span>
        <span class="sono-organ-meta">${label}${uiIcons.chevron}</span>
      </button>`;
  }

  function renderCategory(categoryId) {
    const category = categoryById(categoryId);
    if (!category) return renderEmpty(tr("panel.categoryNotFound"));
    const categoryName = displayCategoryName(category);

    const organs = [...state.organs]
      .filter((organ) => organ.categoryId === categoryId)
      .sort((first, second) => displayOrganName(first).localeCompare(displayOrganName(second), currentLanguage()));

    return `
      <div class="sono-view">
        <div class="sono-category-hero" style="--accent:${escapeHtml(category.color || "#1f7a8c")}">
          <span class="sono-category-hero-icon">${iconSvg(category.icon || "generic", 32)}</span>
          <div>
            <span class="sono-eyebrow">${tr("common.category")}</span>
            <h3>${escapeHtml(categoryName)}</h3>
            <p>${trPlural("count.organAvailable", organs.length)}</p>
          </div>
        </div>
        ${organs.length ? `
          <div class="sono-organ-list">
            ${organs.map((organ) => renderOrganCard(organ, category)).join("")}
          </div>` : `
          <div class="sono-empty-state">
            <span>${iconSvg(category.icon || "generic", 36)}</span>
            <strong>${tr("panel.noOrganHere")}</strong>
            <p>${tr("panel.addFirstOrgan")}</p>
            <button class="sono-secondary-button" data-action="manager" type="button">${tr("panel.openManager")}</button>
          </div>`}
      </div>`;
  }

  function renderLibrary() {
    const entries = state.organs
      .map((organ) => ({ organ, category: categoryById(organ.categoryId) }))
      .filter((entry) => entry.category)
      .sort((first, second) => {
        const categoryOrder = displayCategoryName(first.category)
          .localeCompare(displayCategoryName(second.category), currentLanguage());
        return categoryOrder || displayOrganName(first.organ)
          .localeCompare(displayOrganName(second.organ), currentLanguage());
      });

    return `
      <div class="sono-view">
        <div class="sono-category-hero" style="--accent:#2b7182">
          <span class="sono-category-hero-icon">${iconSvg("library", 32)}</span>
          <div>
            <span class="sono-eyebrow">typevet</span>
            <h3>${tr("common.library")}</h3>
            <p>${trPlural("count.organAvailable", entries.length)}</p>
          </div>
        </div>
        ${entries.length ? `
          <div class="sono-organ-list">
            ${entries.map(({ organ, category }) => renderOrganCard(organ, category)).join("")}
          </div>` : `
          <div class="sono-empty-state">
            <span>${iconSvg("library", 36)}</span>
            <strong>${tr("panel.noOrganInLibrary")}</strong>
            <p>${tr("panel.addFirstOrganLibrary")}</p>
            <button class="sono-secondary-button" data-action="manager" type="button">${tr("panel.openManager")}</button>
          </div>`}
      </div>`;
  }

  function renderOrgan(organId) {
    const organ = organById(organId);
    if (!organ) return renderEmpty(tr("panel.organNotFound"));
    if (state.organSearchOrganId !== organId) {
      state.organSearchOrganId = organId;
      state.organSearchQuery = "";
    }
    const category = categoryById(organ.categoryId);
    const organName = displayOrganName(organ);
    const categoryName = category ? displayCategoryName(category) : tr("common.category");
    const descriptions = orderedDescriptions(
      state.descriptions.filter((description) => description.organId === organId)
    );

    return `
      <div class="sono-view">
        <div class="sono-category-hero" style="--accent:${escapeHtml(category?.color || "#1f7a8c")}">
          <span class="sono-category-hero-icon">${iconSvg(category?.icon || "generic", 32)}</span>
          <div>
            <span class="sono-eyebrow">${escapeHtml(categoryName)}</span>
            <h3>${escapeHtml(organName)}</h3>
            <p>${trPlural("count.descriptionAvailable", descriptions.length)}</p>
          </div>
        </div>
        <button class="sono-organ-add-button" data-action="quick-add" data-id="${escapeHtml(organ.id)}" type="button">
          ${uiIcons.plus}
          <span>${escapeHtml(tr("panel.addDescriptionTo", { organ: organName }))}</span>
        </button>
        ${descriptions.length ? `
          <div class="sono-organ-search-wrap">
            <div class="sono-organ-search">
              <span class="sono-search-icon">${uiIcons.search}</span>
              <input
                type="search"
                data-role="organ-search"
                value="${escapeHtml(state.organSearchQuery)}"
                placeholder="${escapeHtml(tr("panel.searchPlaceholder", { organ: organName }))}"
                aria-label="${escapeHtml(tr("panel.searchAria", { organ: organName }))}"
                autocomplete="off"
                spellcheck="false"
              >
              <button data-action="clear-organ-search" type="button" aria-label="${tr("panel.clearSearch")}" title="${tr("panel.clearSearch")}" ${state.organSearchQuery ? "" : "hidden"}>${uiIcons.close}</button>
            </div>
            <div class="sono-search-meta">
              <span data-role="organ-search-summary" aria-live="polite">${trPlural("count.description", descriptions.length)}</span>
              <span>${tr("panel.searchScope")}</span>
            </div>
          </div>
          <div class="sono-description-list">
            ${descriptions.map(renderDescriptionCard).join("")}
          </div>
          <div class="sono-search-empty" data-role="organ-search-empty" hidden>
            <span>${uiIcons.search}</span>
            <strong>${tr("panel.searchNoResult")}</strong>
            <p>${tr("panel.searchTryAgain")}</p>
          </div>` : `
          <div class="sono-empty-state">
            <span>${iconSvg(category?.icon || "generic", 36)}</span>
            <strong>${tr("panel.noDescriptionHere")}</strong>
            <p>${tr("panel.addFirstWithoutLeaving")}</p>
            <button class="sono-secondary-button" data-action="quick-add" data-id="${escapeHtml(organ.id)}" type="button">${tr("panel.addDescription")}</button>
          </div>`}
      </div>`;
  }

  function renderOrganOptions(selectedId) {
    return state.categories.map((category) => {
      const categoryName = displayCategoryName(category);
      const options = state.organs
        .filter((organ) => organ.categoryId === category.id)
        .sort((first, second) => displayOrganName(first).localeCompare(displayOrganName(second), currentLanguage()))
        .map((organ) => `<option value="${escapeHtml(organ.id)}" ${organ.id === selectedId ? "selected" : ""}>${escapeHtml(displayOrganName(organ))}</option>`)
        .join("");
      return options ? `<optgroup label="${escapeHtml(categoryName)}">${options}</optgroup>` : "";
    }).join("");
  }

  function renderQuickAdd() {
    if (!state.organs.length) {
      return `
        <div class="sono-view sono-empty-state">
          <span>${uiIcons.plus}</span>
          <strong>${tr("panel.createOrganFirst")}</strong>
          <p>${tr("panel.descriptionNeedsOrgan")}</p>
          <button class="sono-secondary-button" data-action="manager" type="button">${tr("panel.openManager")}</button>
        </div>`;
    }

    const selectedOrganId = organById(state.quickAddOrganId)?.id || state.organs[0].id;
    return `
      <div class="sono-view sono-quick-add-view">
        <div class="sono-quick-add-intro">
          <span>${uiIcons.plus}</span>
          <div>
            <strong>${tr("common.newDescription")}</strong>
            <p>${tr("panel.quickAddIntro")}</p>
          </div>
        </div>
        <form class="sono-quick-add-form" data-role="quick-add-form">
          <label class="sono-field">
            <span>${tr("panel.organField")}</span>
            <select name="organId" required>${renderOrganOptions(selectedOrganId)}</select>
          </label>
          <label class="sono-field">
            <span>${tr("panel.titleField")}</span>
            <input name="title" type="text" maxlength="100" placeholder="${tr("panel.titlePlaceholder")}" autocomplete="off" required>
          </label>
          <label class="sono-field">
            <span>${tr("panel.descriptionTextField")}</span>
            <textarea name="text" rows="8" maxlength="20000" placeholder="${tr("panel.descriptionPlaceholder")}" required></textarea>
          </label>
          <label class="sono-quick-favorite">
            <input name="favorite" type="checkbox">
            <span>${uiIcons.star}</span>
            <span><strong>${tr("common.addFavorites")}</strong><small>${tr("panel.favoriteHelp")}</small></span>
          </label>
          <div class="sono-quick-add-actions">
            <button class="sono-form-cancel" data-action="cancel-quick-add" type="button">${tr("common.cancel")}</button>
            <button class="sono-form-save" type="submit">${uiIcons.plus}<span>${tr("common.saveDescription")}</span></button>
          </div>
        </form>
      </div>`;
  }

  function renderDetail(descriptionId) {
    const rawDescription = descriptionById(descriptionId);
    if (!rawDescription) return renderEmpty(tr("panel.descriptionNotFound"));
    const description = displayDescription(rawDescription);

    const organ = organById(description.organId);
    const category = categoryById(organ?.categoryId);
    const organName = organ ? displayOrganName(organ) : tr("common.noOrgan");
    const categoryName = category ? displayCategoryName(category) : tr("common.noCategory");
    const favoriteAction = description.favorite ? tr("panel.favoriteRemove") : tr("panel.favoriteAdd");
    return `
      <div class="sono-view sono-detail-view">
        <div class="sono-detail-heading">
          <span class="sono-detail-icon" style="--accent:${escapeHtml(category?.color || "#1f7a8c")}">
            ${iconSvg(category?.icon || "generic", 30)}
          </span>
          <div>
            <span class="sono-eyebrow">${escapeHtml(categoryName)} · ${escapeHtml(organName)}</span>
            <h3>${escapeHtml(description.title)}</h3>
          </div>
          <button class="sono-icon-button ${description.favorite ? "is-favorite" : ""}" data-action="favorite" data-id="${escapeHtml(description.id)}" type="button" title="${favoriteAction}" aria-label="${favoriteAction}">
            ${uiIcons.star}
          </button>
        </div>
        ${description.isSample ? `
          <button class="sono-sample-notice" data-action="manager" type="button">
            ${tr("panel.sampleNotice")}
          </button>` : ""}
        <div class="sono-text-preview" tabindex="0">${escapeHtml(description.text)}</div>
        <button class="sono-copy-large" data-action="copy" data-id="${escapeHtml(description.id)}" type="button">
          ${uiIcons.copy}
          <span>${tr("panel.copyDescription")}</span>
        </button>
        <button class="sono-edit-link" data-action="manager" type="button">${tr("panel.editInManager")}</button>
      </div>`;
  }

  function renderEmpty(message) {
    return `<div class="sono-empty-state"><strong>${escapeHtml(message)}</strong><button class="sono-secondary-button" data-action="home" type="button">${tr("panel.goHome")}</button></div>`;
  }

  function createId(prefix, name) {
    const slug = name.normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 35) || prefix;
    return `${slug}-${crypto.randomUUID().slice(0, 8)}`;
  }

  function preferredQuickAddOrganId(requestedId) {
    if (organById(requestedId)) return requestedId;
    if (state.view.name === "organ" && organById(state.view.organId)) return state.view.organId;
    if (state.view.name === "category") {
      const categoryOrganId = state.organs.find((organ) => organ.categoryId === state.view.categoryId)?.id;
      if (categoryOrganId) return categoryOrganId;
    }
    if (state.view.name === "detail") {
      const descriptionOrganId = descriptionById(state.view.descriptionId)?.organId;
      if (organById(descriptionOrganId)) return descriptionOrganId;
    }
    return state.organs[0]?.id || null;
  }

  function openQuickAdd(organId) {
    if (state.view.name === "add") return;
    state.quickAddReturnView = { ...state.view };
    state.quickAddOrganId = preferredQuickAddOrganId(organId);
    state.view = { name: "add", categoryId: null, organId: null, descriptionId: null };
    render();
    panelBody.scrollTop = 0;
    window.setTimeout(() => panelBody.querySelector('input[name="title"]')?.focus({ preventScroll: true }), 40);
  }

  async function saveQuickDescription(event) {
    event.preventDefault();
    const form = event.target;
    if (!form.matches('[data-role="quick-add-form"]')) return;

    const organId = form.querySelector('select[name="organId"]')?.value || "";
    const title = form.querySelector('input[name="title"]')?.value.trim() || "";
    const descriptionText = form.querySelector('textarea[name="text"]')?.value.trim() || "";
    const favorite = Boolean(form.querySelector('input[name="favorite"]')?.checked);

    if (!organById(organId) || !title || !descriptionText) {
      showToast(tr("toast.descriptionRequired"), "error");
      return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) submitButton.disabled = true;
    const timestamp = new Date().toISOString();
    const description = {
      id: createId("descricao", title),
      organId,
      title,
      text: descriptionText,
      favorite,
      usageCount: 0,
      lastUsedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      isSample: false
    };

    try {
      state.descriptions = [...state.descriptions, description];
      await chrome.storage.local.set({ [STORAGE_KEYS.descriptions]: state.descriptions });
      const quickAddReturnView = state.quickAddReturnView;
      state.quickAddReturnView = null;
      state.quickAddOrganId = null;
      state.organSearchOrganId = organId;
      state.organSearchQuery = "";
      state.organReturnView = quickAddReturnView?.name === "library"
        || (quickAddReturnView?.name === "organ" && state.organReturnView === "library")
        ? "library"
        : "category";
      state.view = { name: "organ", categoryId: null, organId, descriptionId: null };
      render();
      panelBody.scrollTop = 0;
      showToast(tr("toast.descriptionCreated"));
    } catch {
      state.descriptions = state.descriptions.filter((item) => item.id !== description.id);
      if (submitButton) submitButton.disabled = false;
      showToast(tr("toast.descriptionSaveFailed"), "error");
    }
  }

  function render() {
    if (!panelBody) return;

    if (state.view.name === "add") {
      panelTitle.textContent = tr("common.newDescription");
      backButton.hidden = false;
      panelBody.innerHTML = renderQuickAdd();
    } else if (state.view.name === "library") {
      panelTitle.textContent = tr("common.library");
      backButton.hidden = false;
      panelBody.innerHTML = renderLibrary();
    } else if (state.view.name === "category") {
      const category = categoryById(state.view.categoryId);
      panelTitle.textContent = category ? displayCategoryName(category) : tr("common.category");
      backButton.hidden = false;
      panelBody.innerHTML = renderCategory(state.view.categoryId);
    } else if (state.view.name === "organ") {
      const organ = organById(state.view.organId);
      panelTitle.textContent = organ ? displayOrganName(organ) : tr("common.organ");
      backButton.hidden = false;
      panelBody.innerHTML = renderOrgan(state.view.organId);
      applyOrganSearchFilter();
    } else if (state.view.name === "detail") {
      const description = descriptionById(state.view.descriptionId);
      panelTitle.textContent = description ? displayDescription(description).title : tr("common.description");
      backButton.hidden = false;
      panelBody.innerHTML = renderDetail(state.view.descriptionId);
    } else {
      panelTitle.textContent = tr("common.descriptions");
      backButton.hidden = true;
      panelBody.innerHTML = renderHome();
    }

    refreshFixedUi();
    if (quickAddFooterButton) quickAddFooterButton.hidden = state.view.name === "add";
    if (state.panelOpen) window.requestAnimationFrame(positionPanel);
  }

  function floatingButtonIsVisible() {
    return state.settings.showFloatingButton !== false;
  }

  function applyFloatingButtonVisibility() {
    if (!floatingButton) return;
    floatingButton.hidden = !floatingButtonIsVisible();
    if (floatingButtonIsVisible()) applySavedFabPosition();
    if (state.panelOpen) positionPanel();
  }

  function refreshFixedUi() {
    if (!floatingButton) return;
    host.lang = currentLanguage();
    floatingButton.title = tr("panel.fabTitle");
    floatingButton.setAttribute("aria-label", tr("panel.fabAria"));
    floatingButtonLabel.textContent = tr("panel.fabLabel");
    panel.setAttribute("aria-label", tr("panel.dialogAria"));
    backButton.setAttribute("aria-label", tr("common.back"));
    closeButton.setAttribute("aria-label", tr("panel.close"));
    quickAddFooterLabel.textContent = tr("common.newDescription");
    managerFooterLabel.textContent = tr("common.manage");
    const fabVisible = floatingButtonIsVisible();
    fabVisibilityLabel.textContent = tr(fabVisible ? "panel.hideFab" : "panel.showFab");
    fabVisibilityButton.title = tr(fabVisible ? "panel.hideFabTitle" : "panel.showFabTitle");
    fabVisibilityButton.setAttribute("aria-label", fabVisibilityButton.title);
    languageButton.textContent = currentLanguage() === "en" ? "EN" : "PT";
    const languageTitle = tr(currentLanguage() === "en" ? "panel.languageToPortuguese" : "panel.languageToEnglish");
    languageButton.title = languageTitle;
    languageButton.setAttribute("aria-label", languageTitle);
  }

  async function toggleFloatingButtonVisibility() {
    const showFloatingButton = !floatingButtonIsVisible();
    state.settings = { ...state.settings, showFloatingButton };
    applyFloatingButtonVisibility();
    refreshFixedUi();
    await chrome.storage.local.set({ [STORAGE_KEYS.settings]: state.settings });
    showToast(tr(showFloatingButton ? "toast.fabShown" : "toast.fabHidden"));
  }

  async function toggleLanguage() {
    const language = currentLanguage() === "en" ? "pt-BR" : "en";
    state.settings = { ...state.settings, language };
    render();
    await chrome.storage.local.set({ [STORAGE_KEYS.settings]: state.settings });
    showToast(tr(language === "en" ? "toast.languageEnglish" : "toast.languagePortuguese"));
  }

  function getFabBounds() {
    const margin = window.innerWidth <= 520 ? 16 : 24;
    const width = floatingButton?.offsetWidth || 54;
    const height = floatingButton?.offsetHeight || 54;
    const minLeft = Math.min(margin, Math.max(4, window.innerWidth - width - 4));
    const minTop = Math.min(margin, Math.max(4, window.innerHeight - height - 4));
    return {
      minLeft,
      minTop,
      maxLeft: Math.max(minLeft, window.innerWidth - width - margin),
      maxTop: Math.max(minTop, window.innerHeight - height - margin)
    };
  }

  function setFabCoordinates(left, top) {
    if (!floatingButton) return;
    const bounds = getFabBounds();
    floatingButton.style.left = `${Math.round(clamp(left, bounds.minLeft, bounds.maxLeft))}px`;
    floatingButton.style.top = `${Math.round(clamp(top, bounds.minTop, bounds.maxTop))}px`;
    floatingButton.style.right = "auto";
    floatingButton.style.bottom = "auto";
  }

  function applySavedFabPosition() {
    if (!floatingButton || floatingButton.hidden || dragState.pointerId !== null) return;
    const bounds = getFabBounds();
    const storedPosition = state.settings?.fabPosition;
    const xRatio = typeof storedPosition?.xRatio === "number" && Number.isFinite(storedPosition.xRatio)
      ? clamp(storedPosition.xRatio, 0, 1)
      : 1;
    const yRatio = typeof storedPosition?.yRatio === "number" && Number.isFinite(storedPosition.yRatio)
      ? clamp(storedPosition.yRatio, 0, 1)
      : 1;
    setFabCoordinates(
      bounds.minLeft + ((bounds.maxLeft - bounds.minLeft) * xRatio),
      bounds.minTop + ((bounds.maxTop - bounds.minTop) * yRatio)
    );
    if (state.panelOpen) positionPanel();
  }

  async function persistFabPosition() {
    const bounds = getFabBounds();
    const renderedRect = floatingButton.getBoundingClientRect();
    const inlineLeft = Number.parseFloat(floatingButton.style.left);
    const inlineTop = Number.parseFloat(floatingButton.style.top);
    const currentLeft = Number.isFinite(inlineLeft) ? inlineLeft : renderedRect.left;
    const currentTop = Number.isFinite(inlineTop) ? inlineTop : renderedRect.top;
    const xSpan = bounds.maxLeft - bounds.minLeft;
    const ySpan = bounds.maxTop - bounds.minTop;
    const fabPosition = {
      xRatio: xSpan ? clamp((currentLeft - bounds.minLeft) / xSpan, 0, 1) : 0,
      yRatio: ySpan ? clamp((currentTop - bounds.minTop) / ySpan, 0, 1) : 0
    };
    state.settings = { ...state.settings, fabPosition };
    try {
      await chrome.storage.local.set({ [STORAGE_KEYS.settings]: state.settings });
    } catch {
      showToast(tr("toast.positionSaveFailed"), "error");
    }
  }

  function positionPanel() {
    if (!panel || !floatingButton) return;
    const viewportMargin = 12;
    if (floatingButton.hidden) {
      panel.style.maxHeight = `${Math.max(160, window.innerHeight - (viewportMargin * 2))}px`;
      const panelWidth = panel.offsetWidth;
      panel.style.left = `${Math.round(Math.max(viewportMargin, window.innerWidth - panelWidth - viewportMargin))}px`;
      panel.style.top = `${viewportMargin}px`;
      panel.style.right = "auto";
      panel.style.bottom = "auto";
      panel.dataset.placement = "below";
      panel.style.transformOrigin = "calc(100% - 24px) 0";
      return;
    }
    const fabRect = floatingButton.getBoundingClientRect();
    const availableAbove = Math.max(0, fabRect.top - PANEL_GAP - viewportMargin);
    const availableBelow = Math.max(0, window.innerHeight - fabRect.bottom - PANEL_GAP - viewportMargin);
    const placeAbove = availableAbove >= availableBelow;
    const availableHeight = placeAbove ? availableAbove : availableBelow;

    panel.style.maxHeight = `${Math.max(160, Math.floor(availableHeight))}px`;
    const panelWidth = panel.offsetWidth;
    const panelHeight = panel.offsetHeight;
    const centeredLeft = fabRect.left + (fabRect.width / 2) - (panelWidth / 2);
    const left = clamp(centeredLeft, viewportMargin, Math.max(viewportMargin, window.innerWidth - panelWidth - viewportMargin));
    const top = placeAbove
      ? Math.max(viewportMargin, fabRect.top - PANEL_GAP - panelHeight)
      : Math.min(window.innerHeight - panelHeight - viewportMargin, fabRect.bottom + PANEL_GAP);

    panel.style.left = `${Math.round(left)}px`;
    panel.style.top = `${Math.round(Math.max(viewportMargin, top))}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
    panel.dataset.placement = placeAbove ? "above" : "below";
    const originX = clamp(fabRect.left + (fabRect.width / 2) - left, 24, Math.max(24, panelWidth - 24));
    panel.style.transformOrigin = `${Math.round(originX)}px ${placeAbove ? "100%" : "0"}`;
  }

  function handleFabPointerDown(event) {
    if (event.button !== 0 || event.isPrimary === false) return;
    const rect = floatingButton.getBoundingClientRect();
    dragState.pointerId = event.pointerId;
    dragState.startX = event.clientX;
    dragState.startY = event.clientY;
    dragState.startLeft = rect.left;
    dragState.startTop = rect.top;
    dragState.moved = false;
    floatingButton.setPointerCapture(event.pointerId);
  }

  function handleFabPointerMove(event) {
    if (event.pointerId !== dragState.pointerId) return;
    const deltaX = event.clientX - dragState.startX;
    const deltaY = event.clientY - dragState.startY;
    if (!dragState.moved && Math.hypot(deltaX, deltaY) < FAB_DRAG_THRESHOLD) return;

    dragState.moved = true;
    event.preventDefault();
    floatingButton.classList.add("is-dragging");
    setFabCoordinates(dragState.startLeft + deltaX, dragState.startTop + deltaY);
    if (state.panelOpen) positionPanel();
  }

  function finishFabDrag(event) {
    if (event.pointerId !== dragState.pointerId) return;
    const moved = dragState.moved;
    dragState.pointerId = null;
    dragState.moved = false;
    floatingButton.classList.remove("is-dragging");
    if (floatingButton.hasPointerCapture(event.pointerId)) floatingButton.releasePointerCapture(event.pointerId);
    if (moved) {
      dragState.suppressClickUntil = Date.now() + 400;
      void persistFabPosition();
    }
  }

  function handleViewportResize() {
    window.cancelAnimationFrame(resizeFrame);
    resizeFrame = window.requestAnimationFrame(() => {
      applySavedFabPosition();
      if (state.panelOpen) positionPanel();
    });
  }

  function setPanelOpen(open) {
    state.panelOpen = open;
    panel.classList.toggle("is-open", open);
    floatingButton.classList.toggle("is-active", open);
    floatingButton.setAttribute("aria-expanded", String(open));
    panel.setAttribute("aria-hidden", String(!open));

    if (open) {
      render();
      positionPanel();
      window.setTimeout(() => {
        const firstControl = shadow.querySelector(".sono-panel button:not([hidden])");
        firstControl?.focus({ preventScroll: true });
      }, 80);
    }
  }

  function goBack() {
    if (state.view.name === "add") {
      state.view = state.quickAddReturnView || { name: "home", categoryId: null, organId: null, descriptionId: null };
      state.quickAddReturnView = null;
      state.quickAddOrganId = null;
    } else if (state.view.name === "detail") {
      const description = descriptionById(state.view.descriptionId);
      state.view = description
        ? { name: "organ", categoryId: null, organId: description.organId, descriptionId: null }
        : { name: "home", categoryId: null, organId: null, descriptionId: null };
    } else if (state.view.name === "organ") {
      const organ = organById(state.view.organId);
      state.organSearchOrganId = null;
      state.organSearchQuery = "";
      state.view = organ && state.organReturnView === "library"
        ? { name: "library", categoryId: null, organId: null, descriptionId: null }
        : organ
          ? { name: "category", categoryId: organ.categoryId, organId: null, descriptionId: null }
          : { name: "home", categoryId: null, organId: null, descriptionId: null };
      state.organReturnView = null;
    } else {
      state.organReturnView = null;
      state.view = { name: "home", categoryId: null, organId: null, descriptionId: null };
    }
    render();
  }

  function showToast(message, kind = "success") {
    window.clearTimeout(state.toastTimer);
    toast.textContent = message;
    toast.dataset.kind = kind;
    toast.classList.add("is-visible");
    state.toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2400);
  }

  function applyOrganSearchFilter() {
    if (state.view.name !== "organ" || !panelBody) return;
    const input = panelBody.querySelector('[data-role="organ-search"]');
    if (!input) return;

    state.organSearchOrganId = state.view.organId;
    state.organSearchQuery = input.value;
    const query = normalizeSearchText(input.value);
    const cards = [...panelBody.querySelectorAll("[data-description-id]")];
    let visibleCount = 0;

    for (const card of cards) {
      const description = descriptionById(card.dataset.descriptionId);
      const visible = matchesDescriptionSearch(displayDescription(description), query);
      card.hidden = !visible;
      if (visible) visibleCount += 1;
    }

    const summary = panelBody.querySelector('[data-role="organ-search-summary"]');
    if (summary) {
      const label = trPlural("count.description", cards.length).replace(/^\d+\s*/, "");
      summary.textContent = query
        ? tr("panel.searchFiltered", { visible: visibleCount, total: cards.length, label })
        : trPlural("count.description", cards.length);
    }

    const emptyState = panelBody.querySelector('[data-role="organ-search-empty"]');
    if (emptyState) emptyState.hidden = visibleCount > 0;
    const clearButton = panelBody.querySelector('[data-action="clear-organ-search"]');
    if (clearButton) clearButton.hidden = input.value.length === 0;
  }

  async function copyWithFallback(text) {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return;
      } catch {
        // Some pages block the modern API. The selection fallback below still works.
      }
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.cssText = "position:fixed;opacity:0;pointer-events:none;left:-9999px;top:0";
    document.documentElement.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    if (!copied) throw new Error("copy-failed");
  }

  async function copyDescription(id) {
    const rawDescription = descriptionById(id);
    if (!rawDescription) return;
    const description = displayDescription(rawDescription);

    try {
      await copyWithFallback(description.text);
      const timestamp = new Date().toISOString();
      state.descriptions = state.descriptions.map((item) => item.id === id
        ? { ...item, usageCount: (Number(item.usageCount) || 0) + 1, lastUsedAt: timestamp }
        : item);
      await chrome.storage.local.set({ [STORAGE_KEYS.descriptions]: state.descriptions });
      showToast(tr("toast.copied", { title: description.title }));
      render();
    } catch {
      showToast(tr("toast.copyPageFailed"), "error");
    }
  }

  async function toggleFavorite(id) {
    const current = descriptionById(id);
    if (!current) return;

    state.descriptions = state.descriptions.map((description) => description.id === id
      ? { ...description, favorite: !description.favorite, updatedAt: new Date().toISOString() }
      : description);
    await chrome.storage.local.set({ [STORAGE_KEYS.descriptions]: state.descriptions });
    showToast(current.favorite ? tr("toast.favoriteRemoved") : tr("toast.favoriteAdded"));
    render();
  }

  function handleClick(event) {
    const control = event.target.closest("[data-action]");
    if (!control) return;

    const { action, id } = control.dataset;
    if (action === "toggle") {
      if (Date.now() < dragState.suppressClickUntil) return;
      return setPanelOpen(!state.panelOpen);
    }
    if (action === "close") return setPanelOpen(false);
    if (action === "back") return goBack();
    if (action === "quick-add") return openQuickAdd(id);
    if (action === "cancel-quick-add") return goBack();
    if (action === "toggle-fab-visibility") return void toggleFloatingButtonVisibility();
    if (action === "toggle-language") return void toggleLanguage();
    if (action === "home") {
      state.organSearchOrganId = null;
      state.organSearchQuery = "";
      state.organReturnView = null;
      state.view = { name: "home", categoryId: null, organId: null, descriptionId: null };
      return render();
    }
    if (action === "library") {
      state.organSearchOrganId = null;
      state.organSearchQuery = "";
      state.organReturnView = "library";
      state.view = { name: "library", categoryId: null, organId: null, descriptionId: null };
      return render();
    }
    if (action === "category") {
      state.organSearchOrganId = null;
      state.organSearchQuery = "";
      state.organReturnView = "category";
      state.view = { name: "category", categoryId: id, organId: null, descriptionId: null };
      return render();
    }
    if (action === "organ") {
      state.organReturnView = state.view.name === "library" ? "library" : "category";
      state.organSearchOrganId = id;
      state.organSearchQuery = "";
      state.view = { name: "organ", categoryId: null, organId: id, descriptionId: null };
      return render();
    }
    if (action === "detail") {
      const description = descriptionById(id);
      if (description && state.organSearchOrganId !== description.organId) {
        state.organSearchOrganId = description.organId;
        state.organSearchQuery = "";
      }
      state.view = { name: "detail", categoryId: null, organId: null, descriptionId: id };
      return render();
    }
    if (action === "clear-organ-search") {
      const input = panelBody.querySelector('[data-role="organ-search"]');
      if (input) {
        input.value = "";
        applyOrganSearchFilter();
        input.focus({ preventScroll: true });
      }
      return;
    }
    if (action === "copy") return void copyDescription(id);
    if (action === "favorite") return void toggleFavorite(id);
    if (action === "manager") return void chrome.runtime.sendMessage({ type: "SONO_OPEN_OPTIONS" });
  }

  function handleKeydown(event) {
    if (event.key === "Escape" && state.panelOpen) {
      setPanelOpen(false);
      if (!floatingButton.hidden) floatingButton.focus({ preventScroll: true });
    }
  }

  function handleInput(event) {
    if (event.target.matches('[data-role="organ-search"]')) applyOrganSearchFilter();
  }

  async function createUi() {
    host = document.createElement("div");
    host.id = ROOT_ID;
    shadow = host.attachShadow({ mode: "open" });

    const cssText = injectedCssText
      || ":host{all:initial}.sono-fab{position:fixed;right:24px;bottom:24px;z-index:2147483647}";

    shadow.innerHTML = `
      <style>${cssText}</style>
      <button class="sono-fab" data-action="toggle" type="button" title="Clique para abrir ou arraste para mover" aria-label="Abrir descrições de ultrassonografia; arraste para mover" aria-expanded="false">
        <span class="sono-fab-logo" aria-hidden="true">
          <svg viewBox="0 0 48 48"><path d="M12 28c4-11 8-16 12-16s8 5 12 16"/><path d="M17 29c2.5-7 5-10 7-10s4.5 3 7 10"/><path d="M13 34h22"/></svg>
        </span>
        <span class="sono-fab-label">Descrições</span>
      </button>

      <section class="sono-panel" role="dialog" aria-label="Descrições de ultrassonografia" aria-hidden="true">
        <header class="sono-panel-header">
          <button class="sono-header-button sono-back-button" data-action="back" type="button" aria-label="Voltar" hidden>${uiIcons.back}</button>
          <div class="sono-brand">
            <span class="sono-brand-mark" aria-hidden="true">
              <svg viewBox="0 0 36 36"><path d="M9 21c3-8 6-12 9-12s6 4 9 12"/><path d="M12.5 22c2-5 3.8-7 5.5-7s3.5 2 5.5 7"/><path d="M10 26h16"/></svg>
            </span>
            <span><small>typevet</small><strong class="sono-panel-title">Descrições</strong></span>
          </div>
          <button class="sono-language-button" data-action="toggle-language" type="button" aria-label="Mudar interface para inglês" title="Mudar interface para inglês">PT</button>
          <button class="sono-header-button" data-action="close" type="button" aria-label="Fechar painel">${uiIcons.close}</button>
        </header>
        <main class="sono-panel-body"></main>
        <footer class="sono-panel-footer">
          <button class="sono-footer-add" data-action="quick-add" data-role="quick-add-footer" type="button">${uiIcons.plus}<span>Nova descrição</span></button>
          <button data-action="toggle-fab-visibility" data-role="fab-visibility" type="button">${uiIcons.visibility}<span>Desativar botão</span></button>
          <button data-action="manager" type="button">${uiIcons.settings}<span>Gerenciar</span></button>
        </footer>
      </section>
      <div class="sono-toast" role="status" aria-live="polite"></div>`;

    document.documentElement.appendChild(host);
    panel = shadow.querySelector(".sono-panel");
    panelTitle = shadow.querySelector(".sono-panel-title");
    panelBody = shadow.querySelector(".sono-panel-body");
    backButton = shadow.querySelector(".sono-back-button");
    floatingButton = shadow.querySelector(".sono-fab");
    floatingButtonLabel = shadow.querySelector(".sono-fab-label");
    quickAddFooterButton = shadow.querySelector('[data-role="quick-add-footer"]');
    quickAddFooterLabel = quickAddFooterButton.querySelector("span");
    managerFooterLabel = shadow.querySelector('[data-action="manager"] span');
    fabVisibilityButton = shadow.querySelector('[data-role="fab-visibility"]');
    fabVisibilityLabel = fabVisibilityButton.querySelector("span");
    languageButton = shadow.querySelector(".sono-language-button");
    closeButton = shadow.querySelector('[data-action="close"]');
    toast = shadow.querySelector(".sono-toast");

    shadow.addEventListener("click", handleClick);
    shadow.addEventListener("keydown", handleKeydown);
    shadow.addEventListener("input", handleInput);
    shadow.addEventListener("submit", (event) => void saveQuickDescription(event));
    floatingButton.addEventListener("pointerdown", handleFabPointerDown);
    floatingButton.addEventListener("pointermove", handleFabPointerMove);
    floatingButton.addEventListener("pointerup", finishFabDrag);
    floatingButton.addEventListener("pointercancel", finishFabDrag);
    floatingButton.addEventListener("lostpointercapture", finishFabDrag);
    window.addEventListener("resize", handleViewportResize, { passive: true });
    applyFloatingButtonVisibility();
    render();
    if (openPanelRequested) {
      openPanelRequested = false;
      setPanelOpen(true);
    }
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "TYPEVET_OPEN_PANEL") {
      openPanelRequested = true;
      if (panel) {
        openPanelRequested = false;
        setPanelOpen(true);
      }
      sendResponse({ handled: true });
      return;
    }
    if (message?.type === "SONO_TOGGLE_PANEL" && panel) {
      setPanelOpen(!state.panelOpen);
      sendResponse({ handled: true });
    }
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") return;
    if (changes[STORAGE_KEYS.categories]) state.categories = changes[STORAGE_KEYS.categories].newValue || [];
    if (changes[STORAGE_KEYS.organs]) state.organs = changes[STORAGE_KEYS.organs].newValue || [];
    if (changes[STORAGE_KEYS.descriptions]) state.descriptions = changes[STORAGE_KEYS.descriptions].newValue || [];
    if (changes[STORAGE_KEYS.settings]) {
      state.settings = changes[STORAGE_KEYS.settings].newValue || {};
      applyFloatingButtonVisibility();
    }
    render();
  });

  (async () => {
    await loadData();
    await createUi();
  })().catch(() => undefined);
})();
