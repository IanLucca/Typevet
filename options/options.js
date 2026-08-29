(function initializeOptionsPage() {
  "use strict";

  const { STORAGE_KEYS, migrateStoredData, normalizeSearchText } = globalThis.TYPEVET;
  const {
    normalizeLanguage,
    t: translate,
    plural: translatePlural,
    applyTranslations,
    localizeCategoryName,
    localizeOrganName,
    localizeDescription
  } = globalThis.TYPEVET_I18N;
  const FAVORITES_FILTER = "__favorites__";
  const ALLOWED_ICONS = new Set([
    "abdome",
    "cervical",
    "ocular",
    "urinario",
    "tireoide",
    "vascular",
    "obstetricia",
    "generic"
  ]);

  const state = {
    categories: [],
    organs: [],
    descriptions: [],
    settings: {},
    selectedCategoryId: null,
    search: "",
    toastTimer: null
  };

  const elements = {
    categoryNav: document.querySelector("#categoryNav"),
    descriptionList: document.querySelector("#descriptionList"),
    descriptionCount: document.querySelector("#descriptionCount"),
    organCount: document.querySelector("#organCount"),
    categoryCount: document.querySelector("#categoryCount"),
    copyCount: document.querySelector("#copyCount"),
    listTitle: document.querySelector("#listTitle"),
    listSubtitle: document.querySelector("#listSubtitle"),
    searchInput: document.querySelector("#searchInput"),
    newDescriptionButton: document.querySelector("#newDescriptionButton"),
    newOrganButton: document.querySelector("#newOrganButton"),
    newCategoryButton: document.querySelector("#newCategoryButton"),
    importButton: document.querySelector("#importButton"),
    exportButton: document.querySelector("#exportButton"),
    importInput: document.querySelector("#importInput"),
    languageSelect: document.querySelector("#languageSelect"),
    toast: document.querySelector("#toast"),
    descriptionDialog: document.querySelector("#descriptionDialog"),
    descriptionForm: document.querySelector("#descriptionForm"),
    descriptionDialogTitle: document.querySelector("#descriptionDialogTitle"),
    descriptionId: document.querySelector("#descriptionId"),
    descriptionTitle: document.querySelector("#descriptionTitle"),
    descriptionOrgan: document.querySelector("#descriptionOrgan"),
    descriptionText: document.querySelector("#descriptionText"),
    descriptionFavorite: document.querySelector("#descriptionFavorite"),
    characterCount: document.querySelector("#characterCount"),
    organDialog: document.querySelector("#organDialog"),
    organForm: document.querySelector("#organForm"),
    organDialogTitle: document.querySelector("#organDialogTitle"),
    organId: document.querySelector("#organId"),
    organName: document.querySelector("#organName"),
    organCategory: document.querySelector("#organCategory"),
    deleteOrganButton: document.querySelector("#deleteOrganButton"),
    categoryDialog: document.querySelector("#categoryDialog"),
    categoryForm: document.querySelector("#categoryForm"),
    categoryDialogTitle: document.querySelector("#categoryDialogTitle"),
    categoryId: document.querySelector("#categoryId"),
    categoryName: document.querySelector("#categoryName"),
    categoryColor: document.querySelector("#categoryColor"),
    deleteCategoryButton: document.querySelector("#deleteCategoryButton")
  };

  const icons = {
    edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 5 5 5M5 19l2-6L16 4a1.4 1.4 0 0 1 2 0l2 2a1.4 1.4 0 0 1 0 2L11 17l-6 2Z"/></svg>',
    copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="10" height="11" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h2"/></svg>',
    star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/></svg>',
    trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/></svg>',
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    empty: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7.5 12 3l8 4.5V17l-8 4-8-4V7.5Z"/><path d="m4 7.5 8 4 8-4M12 11.5V21"/></svg>'
  };

  const escapeHtml = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const currentLanguage = () => normalizeLanguage(state.settings.language);
  const tr = (key, values) => translate(currentLanguage(), key, values);
  const trPlural = (key, count, values) => translatePlural(currentLanguage(), key, count, values);
  const displayCategoryName = (category) => localizeCategoryName(category, currentLanguage());
  const displayOrganName = (organ) => localizeOrganName(organ, currentLanguage());
  const displayDescription = (description) => localizeDescription(description, currentLanguage());

  function refreshStaticUi() {
    const language = currentLanguage();
    applyTranslations(document, language);
    document.documentElement.lang = language;
    elements.languageSelect.value = language;

    if (elements.descriptionDialog.open) {
      elements.descriptionDialogTitle.textContent = elements.descriptionId.value
        ? tr("common.editDescription")
        : tr("common.newDescription");
    }
    if (elements.organDialog.open) {
      elements.organDialogTitle.textContent = elements.organId.value
        ? tr("common.editOrgan")
        : tr("common.newOrgan");
    }
    if (elements.categoryDialog.open) {
      elements.categoryDialogTitle.textContent = elements.categoryId.value
        ? tr("common.editCategory")
        : tr("common.newCategory");
    }
  }

  function iconSvg(name) {
    const paths = {
      abdome: '<ellipse cx="12" cy="12" rx="7.5" ry="9"/><path d="M8 9.5c2.2-1.6 5.8-1.6 8 0M8.5 14.5c1.8 1.3 5.2 1.3 7 0"/>',
      cervical: '<path d="M9 4.5c0 2-1.2 3.4-2.4 4.8C5.5 10.6 5 12 5.5 14c.8 3 3.3 5 6.5 5s5.7-2 6.5-5c.5-2-.1-3.4-1.1-4.7C16.2 8 15 6.5 15 4.5"/><path d="M9 8.5h6M9.5 12h5M10 15.5h4"/>',
      ocular: '<path d="M2.8 12s3.3-5.2 9.2-5.2 9.2 5.2 9.2 5.2-3.3 5.2-9.2 5.2S2.8 12 2.8 12Z"/><circle cx="12" cy="12" r="3"/>',
      urinario: '<path d="M8.5 5.5c-2.7.8-4 3.1-3.7 6.2.2 2.5 1.8 4.7 4 5.5 1.4.5 2.2-.3 2.2-1.6V8.2c0-2.2-.8-3.2-2.5-2.7ZM15.5 5.5c2.7.8 4 3.1 3.7 6.2-.2 2.5-1.8 4.7-4 5.5-1.4.5-2.2-.3-2.2-1.6V8.2c0-2.2.8-3.2 2.5-2.7Z"/>',
      tireoide: '<path d="M7.2 6.2c-2.2 1-3.3 3.3-2.5 5.4.7 1.9 2.2 2.8 4.4 2.8H11V9.6C11 6.8 9.5 5.2 7.2 6.2ZM16.8 6.2c2.2 1 3.3 3.3 2.5 5.4-.7 1.9-2.2 2.8-4.4 2.8H13V9.6c0-2.8 1.5-4.4 3.8-3.4Z"/>',
      vascular: '<path d="M12 20V4M12 9 7 5M12 12l6-4M12 15l-5 4M12 17l4 3"/>',
      obstetricia: '<circle cx="12" cy="12" r="8"/><path d="M9 13c1.2 1.7 4.8 1.7 6 0M9.2 9.7h.1M14.7 9.7h.1"/>',
      generic: '<circle cx="12" cy="12" r="8"/><path d="M8 12h8M12 8v8"/>'
    };
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.generic}</svg>`;
  }

  function categoryById(id) {
    return state.categories.find((category) => category.id === id);
  }

  function organById(id) {
    return state.organs.find((organ) => organ.id === id);
  }

  function descriptionById(id) {
    return state.descriptions.find((description) => description.id === id);
  }

  function showToast(message, kind = "success") {
    window.clearTimeout(state.toastTimer);
    elements.toast.textContent = message;
    elements.toast.dataset.kind = kind;
    elements.toast.classList.add("is-visible");
    state.toastTimer = window.setTimeout(() => elements.toast.classList.remove("is-visible"), 2600);
  }

  async function loadData() {
    const stored = await chrome.storage.local.get(Object.values(STORAGE_KEYS));
    const migrated = migrateStoredData(stored);
    state.categories = migrated.categories;
    state.organs = migrated.organs;
    state.descriptions = migrated.descriptions;
    state.settings = migrated.settings;

    if (migrated.didMigrate) {
      await chrome.storage.local.set({
        [STORAGE_KEYS.categories]: state.categories,
        [STORAGE_KEYS.organs]: state.organs,
        [STORAGE_KEYS.descriptions]: state.descriptions,
        [STORAGE_KEYS.settings]: state.settings
      });
    }
  }

  function renderCategoryNav() {
    const total = state.descriptions.length;
    const favorites = state.descriptions.filter((description) => description.favorite).length;
    const navItems = [
      `
        <div class="category-nav-item ${state.selectedCategoryId === null ? "is-active" : ""}">
          <button class="category-filter" data-action="filter" data-id="" type="button">
            <span class="category-dot" style="--accent:#2b7182"></span>
            <span>${tr("common.library")}</span>
            <span class="count">${total}</span>
          </button>
        </div>`,
      `
        <div class="category-nav-item ${state.selectedCategoryId === FAVORITES_FILTER ? "is-active" : ""}">
          <button class="category-filter" data-action="filter" data-id="${FAVORITES_FILTER}" type="button">
            <span class="category-dot" style="--accent:#d49a2d"></span>
            <span>${tr("common.favorites")}</span>
            <span class="count">${favorites}</span>
          </button>
        </div>`
    ];

    for (const category of state.categories) {
      const organCount = state.organs.filter((organ) => organ.categoryId === category.id).length;
      const categoryName = displayCategoryName(category);
      navItems.push(`
        <div class="category-nav-item ${state.selectedCategoryId === category.id ? "is-active" : ""}">
          <button class="category-filter" data-action="filter" data-id="${escapeHtml(category.id)}" type="button">
            <span class="category-dot" style="--accent:${escapeHtml(category.color || "#1f7a8c")}"></span>
            <span>${escapeHtml(categoryName)}</span>
            <span class="count">${organCount}</span>
          </button>
          <button class="category-edit" data-action="edit-category" data-id="${escapeHtml(category.id)}" type="button" title="${escapeHtml(tr("options.editNamed", { name: categoryName }))}" aria-label="${escapeHtml(tr("options.editNamed", { name: categoryName }))}">${icons.edit}</button>
        </div>`);
    }
    elements.categoryNav.innerHTML = navItems.join("");
  }

  function organGroups() {
    const query = normalizeSearchText(state.search);
    const groups = [];

    for (const organ of state.organs) {
      const rawCategory = categoryById(organ.categoryId);
      const category = rawCategory ? { ...rawCategory, name: displayCategoryName(rawCategory) } : null;
      const displayOrgan = { ...organ, name: displayOrganName(organ) };
      if (state.selectedCategoryId && state.selectedCategoryId !== FAVORITES_FILTER && organ.categoryId !== state.selectedCategoryId) continue;

      const allDescriptions = state.descriptions
        .filter((description) => description.organId === organ.id)
        .map(displayDescription);
      let descriptions = state.selectedCategoryId === FAVORITES_FILTER
        ? allDescriptions.filter((description) => description.favorite)
        : allDescriptions;

      if (query) {
        const groupMatches = normalizeSearchText(displayOrgan.name).includes(query)
          || normalizeSearchText(category?.name).includes(query);
        if (!groupMatches) {
          descriptions = descriptions.filter((description) =>
            normalizeSearchText(description.title).includes(query)
            || normalizeSearchText(description.text).includes(query));
        }
      }

      if ((state.selectedCategoryId === FAVORITES_FILTER || query) && !descriptions.length) continue;
      groups.push({ organ: displayOrgan, category, descriptions: descriptions.sort((a, b) => a.title.localeCompare(b.title, currentLanguage())) });
    }

    return groups.sort((first, second) => {
      const categoryOrder = (first.category?.name || "").localeCompare(second.category?.name || "", currentLanguage());
      return categoryOrder || first.organ.name.localeCompare(second.organ.name, currentLanguage());
    });
  }

  function renderDescriptionRow(description, organ, category) {
    const favoriteAction = description.favorite ? tr("panel.favoriteRemove") : tr("panel.favoriteAdd");
    return `
      <article class="description-row">
        <span class="row-icon" style="--accent:${escapeHtml(category?.color || "#1f7a8c")}">${iconSvg(category?.icon || "generic")}</span>
        <div class="row-heading">
          <strong>${escapeHtml(description.title)}</strong>
          <span>${escapeHtml(organ.name)}${description.isSample ? `<span class="sample-badge">${tr("common.sample")}</span>` : ""}</span>
        </div>
        <div class="row-preview"><p>${escapeHtml(description.text)}</p></div>
        <div class="row-actions">
          <button class="row-action ${description.favorite ? "is-favorite" : ""}" data-action="favorite" data-id="${escapeHtml(description.id)}" type="button" title="${escapeHtml(favoriteAction)}" aria-label="${escapeHtml(favoriteAction)}">${icons.star}</button>
          <button class="row-action" data-action="copy" data-id="${escapeHtml(description.id)}" type="button" title="${tr("common.copy")}" aria-label="${escapeHtml(tr("options.copyNamed", { name: description.title }))}">${icons.copy}</button>
          <button class="row-action" data-action="edit" data-id="${escapeHtml(description.id)}" type="button" title="${tr("common.edit")}" aria-label="${escapeHtml(tr("options.editNamed", { name: description.title }))}">${icons.edit}</button>
          <button class="row-action is-danger" data-action="delete" data-id="${escapeHtml(description.id)}" type="button" title="${tr("common.delete")}" aria-label="${escapeHtml(tr("options.deleteNamed", { name: description.title }))}">${icons.trash}</button>
        </div>
      </article>`;
  }

  function renderOrganGroup(group) {
    const { organ, category, descriptions } = group;
    const countLabel = trPlural("count.description", descriptions.length);
    return `
      <section class="organ-group" style="--accent:${escapeHtml(category?.color || "#1f7a8c")}">
        <header class="organ-group-header">
          <span class="organ-group-icon">${iconSvg(category?.icon || "generic")}</span>
          <div class="organ-group-title">
            <strong>${escapeHtml(organ.name)}</strong>
            <span>${escapeHtml(category?.name || tr("common.noCategory"))} · ${countLabel}</span>
          </div>
          <div class="organ-group-actions">
            <button class="organ-group-button" data-action="add-to-organ" data-id="${escapeHtml(organ.id)}" type="button">${icons.plus}<span>${tr("options.addText")}</span></button>
            <button class="row-action" data-action="edit-organ" data-id="${escapeHtml(organ.id)}" type="button" title="${tr("common.editOrgan")}" aria-label="${escapeHtml(tr("options.editNamed", { name: organ.name }))}">${icons.edit}</button>
          </div>
        </header>
        <div class="organ-descriptions">
          ${descriptions.length
            ? descriptions.map((description) => renderDescriptionRow(description, organ, category)).join("")
            : `<div class="organ-empty">${tr("options.noDescriptionInOrgan")}</div>`}
        </div>
      </section>`;
  }

  function renderDescriptionList() {
    const groups = organGroups();
    let title = tr("options.libraryByOrgans");
    if (state.selectedCategoryId === FAVORITES_FILTER) title = tr("options.favoriteDescriptions");
    else if (state.selectedCategoryId) title = displayCategoryName(categoryById(state.selectedCategoryId)) || tr("common.category");

    const descriptionCount = groups.reduce((total, group) => total + group.descriptions.length, 0);
    elements.listTitle.textContent = title;
    const organLabel = trPlural("count.organ", groups.length);
    const descriptionLabel = trPlural("count.description", descriptionCount);
    elements.listSubtitle.textContent = state.search
      ? tr("options.searchSummary", { organs: organLabel, descriptions: descriptionLabel, query: state.search })
      : tr("options.viewSummary", { organs: organLabel });

    if (!groups.length) {
      const hasFilters = Boolean(state.search || state.selectedCategoryId);
      elements.descriptionList.innerHTML = `
        <div class="empty-library">
          <span class="empty-icon">${icons.empty}</span>
          <strong>${hasFilters ? tr("options.noResults") : tr("options.emptyLibrary")}</strong>
          <p>${hasFilters ? tr("options.changeFilter") : tr("options.createFirstOrgan")}</p>
          <button class="button button-primary" data-action="new-organ" type="button">${tr("common.newOrgan")}</button>
        </div>`;
      return;
    }
    elements.descriptionList.innerHTML = groups.map(renderOrganGroup).join("");
  }

  function renderStats() {
    elements.descriptionCount.textContent = String(state.descriptions.length);
    elements.organCount.textContent = String(state.organs.length);
    elements.categoryCount.textContent = String(state.categories.length);
    elements.copyCount.textContent = String(state.descriptions.reduce((sum, description) => sum + (Number(description.usageCount) || 0), 0));
  }

  function render() {
    renderCategoryNav();
    renderStats();
    renderDescriptionList();
  }

  function fillCategorySelect(select, selectedId) {
    select.innerHTML = state.categories
      .map((category) => `<option value="${escapeHtml(category.id)}" ${category.id === selectedId ? "selected" : ""}>${escapeHtml(displayCategoryName(category))}</option>`)
      .join("");
  }

  function fillOrganSelect(selectedId) {
    const groups = state.categories.map((category) => {
      const categoryName = displayCategoryName(category);
      const options = state.organs
        .filter((organ) => organ.categoryId === category.id)
        .sort((a, b) => displayOrganName(a).localeCompare(displayOrganName(b), currentLanguage()))
        .map((organ) => `<option value="${escapeHtml(organ.id)}" ${organ.id === selectedId ? "selected" : ""}>${escapeHtml(displayOrganName(organ))}</option>`)
        .join("");
      return options ? `<optgroup label="${escapeHtml(categoryName)}">${options}</optgroup>` : "";
    }).join("");
    elements.descriptionOrgan.innerHTML = groups;
  }

  function preferredOrganId() {
    if (state.selectedCategoryId && state.selectedCategoryId !== FAVORITES_FILTER) {
      return state.organs.find((organ) => organ.categoryId === state.selectedCategoryId)?.id;
    }
    return state.organs[0]?.id;
  }

  function openDescriptionDialog(description = null, organId = null) {
    if (!state.organs.length) {
      showToast(tr("options.errorCreateOrganFirst"), "error");
      openOrganDialog();
      return;
    }
    elements.descriptionForm.reset();
    elements.descriptionId.value = description?.id || "";
    const displayItem = description ? displayDescription(description) : null;
    elements.descriptionTitle.value = displayItem?.title || "";
    elements.descriptionText.value = displayItem?.text || "";
    elements.descriptionFavorite.checked = Boolean(description?.favorite);
    elements.descriptionDialogTitle.textContent = description ? tr("common.editDescription") : tr("common.newDescription");
    fillOrganSelect(description?.organId || organId || preferredOrganId());
    elements.characterCount.textContent = String(elements.descriptionText.value.length);
    elements.descriptionDialog.showModal();
    window.setTimeout(() => elements.descriptionTitle.focus(), 40);
  }

  function openOrganDialog(organ = null) {
    if (!state.categories.length) {
      showToast(tr("options.errorCreateCategoryFirst"), "error");
      openCategoryDialog();
      return;
    }
    elements.organForm.reset();
    elements.organId.value = organ?.id || "";
    elements.organName.value = organ ? displayOrganName(organ) : "";
    const selectedCategory = organ?.categoryId
      || (state.selectedCategoryId && state.selectedCategoryId !== FAVORITES_FILTER ? state.selectedCategoryId : state.categories[0].id);
    fillCategorySelect(elements.organCategory, selectedCategory);
    elements.organDialogTitle.textContent = organ ? tr("common.editOrgan") : tr("common.newOrgan");
    elements.deleteOrganButton.hidden = !organ;
    elements.organDialog.showModal();
    window.setTimeout(() => elements.organName.focus(), 40);
  }

  function openCategoryDialog(category = null) {
    elements.categoryForm.reset();
    elements.categoryId.value = category?.id || "";
    elements.categoryName.value = category ? displayCategoryName(category) : "";
    elements.categoryColor.value = /^#[0-9a-f]{6}$/i.test(category?.color || "") ? category.color : "#1f7a8c";
    elements.categoryDialogTitle.textContent = category ? tr("common.editCategory") : tr("common.newCategory");
    elements.deleteCategoryButton.hidden = !category;
    elements.categoryDialog.showModal();
    window.setTimeout(() => elements.categoryName.focus(), 40);
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

  async function saveDescription(event) {
    event.preventDefault();
    const title = elements.descriptionTitle.value.trim();
    const text = elements.descriptionText.value.trim();
    const organId = elements.descriptionOrgan.value;
    const existing = descriptionById(elements.descriptionId.value);
    if (!title || !text || !organById(organId)) {
      showToast(tr("options.errorDescriptionRequired"), "error");
      return;
    }

    const timestamp = new Date().toISOString();
    const description = {
      id: existing?.id || createId("descricao", title),
      organId,
      title,
      text,
      favorite: elements.descriptionFavorite.checked,
      usageCount: existing?.usageCount || 0,
      lastUsedAt: existing?.lastUsedAt || null,
      createdAt: existing?.createdAt || timestamp,
      updatedAt: timestamp,
      isSample: false
    };
    state.descriptions = existing
      ? state.descriptions.map((item) => item.id === existing.id ? description : item)
      : [...state.descriptions, description];
    await chrome.storage.local.set({ [STORAGE_KEYS.descriptions]: state.descriptions });
    elements.descriptionDialog.close();
    render();
    showToast(existing ? tr("options.descriptionUpdated") : tr("options.descriptionCreated"));
  }

  async function saveOrgan(event) {
    event.preventDefault();
    const name = elements.organName.value.trim();
    const categoryId = elements.organCategory.value;
    const existing = organById(elements.organId.value);
    const duplicated = state.organs.some((organ) =>
      organ.id !== existing?.id
      && organ.categoryId === categoryId
      && displayOrganName(organ).localeCompare(name, currentLanguage(), { sensitivity: "base" }) === 0);
    if (!name || !categoryById(categoryId)) {
      showToast(tr("options.errorOrganRequired"), "error");
      return;
    }
    if (duplicated) {
      showToast(tr("options.errorOrganDuplicate"), "error");
      return;
    }

    const timestamp = new Date().toISOString();
    const organ = {
      id: existing?.id || createId("orgao", name),
      categoryId,
      name,
      createdAt: existing?.createdAt || timestamp,
      updatedAt: timestamp,
      isSample: false
    };
    state.organs = existing
      ? state.organs.map((item) => item.id === existing.id ? organ : item)
      : [...state.organs, organ];
    await chrome.storage.local.set({ [STORAGE_KEYS.organs]: state.organs });
    elements.organDialog.close();
    render();
    showToast(existing ? tr("options.organUpdated") : tr("options.organCreated"));
  }

  async function saveCategory(event) {
    event.preventDefault();
    const name = elements.categoryName.value.trim();
    const existing = categoryById(elements.categoryId.value);
    const duplicated = state.categories.some((category) =>
      category.id !== existing?.id && displayCategoryName(category).localeCompare(name, currentLanguage(), { sensitivity: "base" }) === 0);
    if (!name) return showToast(tr("options.errorCategoryRequired"), "error");
    if (duplicated) return showToast(tr("options.errorCategoryDuplicate"), "error");

    const category = {
      id: existing?.id || createId("categoria", name),
      name,
      icon: ALLOWED_ICONS.has(existing?.icon) ? existing.icon : "generic",
      color: /^#[0-9a-f]{6}$/i.test(elements.categoryColor.value) ? elements.categoryColor.value : "#1f7a8c",
      isBase: Boolean(existing?.isBase)
    };
    state.categories = existing
      ? state.categories.map((item) => item.id === existing.id ? category : item)
      : [...state.categories, category];
    await chrome.storage.local.set({ [STORAGE_KEYS.categories]: state.categories });
    elements.categoryDialog.close();
    render();
    showToast(existing ? tr("options.categoryUpdated") : tr("options.categoryCreated"));
  }

  async function deleteDescription(id) {
    const description = descriptionById(id);
    const displayItem = description ? displayDescription(description) : null;
    if (!description || !window.confirm(tr("options.confirmDeleteDescription", { name: displayItem.title }))) return;
    state.descriptions = state.descriptions.filter((item) => item.id !== id);
    await chrome.storage.local.set({ [STORAGE_KEYS.descriptions]: state.descriptions });
    render();
    showToast(tr("options.descriptionDeleted"));
  }

  async function deleteOrgan() {
    const organ = organById(elements.organId.value);
    if (!organ) return;
    const count = state.descriptions.filter((description) => description.organId === organ.id).length;
    if (count) return showToast(tr("options.removeDescriptionsFirst", {
      count,
      label: trPlural("count.description", count).replace(/^\d+\s*/, "")
    }), "error");
    if (!window.confirm(tr("options.confirmDeleteOrgan", { name: displayOrganName(organ) }))) return;
    state.organs = state.organs.filter((item) => item.id !== organ.id);
    await chrome.storage.local.set({ [STORAGE_KEYS.organs]: state.organs });
    elements.organDialog.close();
    render();
    showToast(tr("options.organDeleted"));
  }

  async function deleteCategory() {
    const category = categoryById(elements.categoryId.value);
    if (!category) return;
    const count = state.organs.filter((organ) => organ.categoryId === category.id).length;
    if (count) return showToast(tr("options.removeOrgansFirst", {
      count,
      label: trPlural("count.organ", count).replace(/^\d+\s*/, "")
    }), "error");
    if (!window.confirm(tr("options.confirmDeleteCategory", { name: displayCategoryName(category) }))) return;
    state.categories = state.categories.filter((item) => item.id !== category.id);
    if (state.selectedCategoryId === category.id) state.selectedCategoryId = null;
    await chrome.storage.local.set({ [STORAGE_KEYS.categories]: state.categories });
    elements.categoryDialog.close();
    render();
    showToast(tr("options.categoryDeleted"));
  }

  async function toggleFavorite(id) {
    const description = descriptionById(id);
    if (!description) return;
    state.descriptions = state.descriptions.map((item) => item.id === id
      ? { ...item, favorite: !item.favorite, updatedAt: new Date().toISOString() }
      : item);
    await chrome.storage.local.set({ [STORAGE_KEYS.descriptions]: state.descriptions });
    render();
    showToast(description.favorite ? tr("toast.favoriteRemoved") : tr("toast.favoriteAdded"));
  }

  async function copyDescription(id) {
    const description = descriptionById(id);
    if (!description) return;
    const displayItem = displayDescription(description);
    try {
      await navigator.clipboard.writeText(displayItem.text);
      state.descriptions = state.descriptions.map((item) => item.id === id
        ? { ...item, usageCount: (Number(item.usageCount) || 0) + 1, lastUsedAt: new Date().toISOString() }
        : item);
      await chrome.storage.local.set({ [STORAGE_KEYS.descriptions]: state.descriptions });
      renderStats();
      showToast(tr("toast.copied", { title: displayItem.title }));
    } catch {
      showToast(tr("options.copyFailed"), "error");
    }
  }

  function validateLibrary(raw) {
    if (!raw || typeof raw !== "object" || !Array.isArray(raw.categories) || !Array.isArray(raw.descriptions)) {
      throw new Error(tr("options.invalidBackup"));
    }

    const source = Array.isArray(raw.organs)
      ? { sonoCategories: raw.categories, sonoOrgans: raw.organs, sonoDescriptions: raw.descriptions, sonoSettings: { schemaVersion: 2 } }
      : { sonoCategories: raw.categories, sonoDescriptions: raw.descriptions, sonoSettings: { schemaVersion: 1 } };
    const migrated = migrateStoredData(source);
    if (migrated.categories.length > 500 || migrated.organs.length > 5000 || migrated.descriptions.length > 10000) {
      throw new Error(tr("options.backupLimit"));
    }

    const categoryIds = new Set();
    const categories = migrated.categories.map((item) => {
      const id = String(item?.id || "").trim().slice(0, 100);
      const name = String(item?.name || "").trim().slice(0, 60);
      if (!id || !name || categoryIds.has(id)) throw new Error(tr("options.invalidCategories"));
      categoryIds.add(id);
      return {
        id,
        name,
        icon: ALLOWED_ICONS.has(item.icon) ? item.icon : "generic",
        color: /^#[0-9a-f]{6}$/i.test(item.color || "") ? item.color : "#1f7a8c",
        isBase: Boolean(item.isBase)
      };
    });

    const organIds = new Set();
    const organs = migrated.organs.map((item) => {
      const id = String(item?.id || "").trim().slice(0, 120);
      const categoryId = String(item?.categoryId || "").trim().slice(0, 100);
      const name = String(item?.name || "").trim().slice(0, 80);
      if (!id || !name || !categoryIds.has(categoryId) || organIds.has(id)) throw new Error(tr("options.invalidOrgans"));
      organIds.add(id);
      return {
        id,
        categoryId,
        name,
        createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString(),
        updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : new Date().toISOString(),
        isSample: Boolean(item.isSample)
      };
    });

    const descriptionIds = new Set();
    const descriptions = migrated.descriptions.map((item) => {
      const id = String(item?.id || "").trim().slice(0, 120);
      const organId = String(item?.organId || "").trim().slice(0, 120);
      const title = String(item?.title || "").trim().slice(0, 100);
      const text = String(item?.text || "").trim().slice(0, 20000);
      if (!id || !title || !text || !organIds.has(organId) || descriptionIds.has(id)) {
        throw new Error(tr("options.invalidDescriptions"));
      }
      descriptionIds.add(id);
      return {
        id,
        organId,
        title,
        text,
        favorite: Boolean(item.favorite),
        usageCount: Math.max(0, Number.parseInt(item.usageCount, 10) || 0),
        lastUsedAt: typeof item.lastUsedAt === "string" ? item.lastUsedAt : null,
        createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString(),
        updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : new Date().toISOString(),
        isSample: Boolean(item.isSample)
      };
    });
    return { categories, organs, descriptions };
  }

  function exportBackup() {
    const payload = {
      app: "typevet",
      version: 2,
      exportedAt: new Date().toISOString(),
      categories: state.categories,
      organs: state.organs,
      descriptions: state.descriptions
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `typevet-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast(tr("options.backupExported"));
  }

  async function importBackup(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error(tr("options.fileTooLarge"));
      const normalized = validateLibrary(JSON.parse(await file.text()));
      if (!window.confirm(tr("options.confirmImport", {
        organs: trPlural("count.organ", normalized.organs.length),
        descriptions: trPlural("count.description", normalized.descriptions.length)
      }))) return;
      state.categories = normalized.categories;
      state.organs = normalized.organs;
      state.descriptions = normalized.descriptions;
      state.selectedCategoryId = null;
      state.search = "";
      elements.searchInput.value = "";
      await chrome.storage.local.set({
        [STORAGE_KEYS.categories]: state.categories,
        [STORAGE_KEYS.organs]: state.organs,
        [STORAGE_KEYS.descriptions]: state.descriptions,
        [STORAGE_KEYS.settings]: { ...state.settings, schemaVersion: 2 }
      });
      render();
      showToast(tr("options.backupImported"));
    } catch (error) {
      showToast(error instanceof Error ? error.message : tr("options.backupImportFailed"), "error");
    } finally {
      event.target.value = "";
    }
  }

  function handleCategoryNavClick(event) {
    const control = event.target.closest("[data-action]");
    if (!control) return;
    if (control.dataset.action === "filter") {
      state.selectedCategoryId = control.dataset.id || null;
      render();
    } else if (control.dataset.action === "edit-category") {
      const category = categoryById(control.dataset.id);
      if (category) openCategoryDialog(category);
    }
  }

  function handleLibraryClick(event) {
    const control = event.target.closest("[data-action]");
    if (!control) return;
    const { action, id } = control.dataset;
    if (action === "new-organ") return openOrganDialog();
    if (action === "add-to-organ") return openDescriptionDialog(null, id);
    if (action === "edit-organ") return openOrganDialog(organById(id));
    if (action === "edit") return openDescriptionDialog(descriptionById(id));
    if (action === "delete") return void deleteDescription(id);
    if (action === "favorite") return void toggleFavorite(id);
    if (action === "copy") return void copyDescription(id);
  }

  async function updateLanguage() {
    const language = normalizeLanguage(elements.languageSelect.value);
    state.settings = { ...state.settings, language };
    refreshStaticUi();
    render();
    await chrome.storage.local.set({ [STORAGE_KEYS.settings]: state.settings });
    showToast(language === "en" ? tr("toast.languageEnglish") : tr("toast.languagePortuguese"));
  }

  function bindEvents() {
    elements.categoryNav.addEventListener("click", handleCategoryNavClick);
    elements.descriptionList.addEventListener("click", handleLibraryClick);
    elements.newDescriptionButton.addEventListener("click", () => openDescriptionDialog());
    elements.newOrganButton.addEventListener("click", () => openOrganDialog());
    elements.newCategoryButton.addEventListener("click", () => openCategoryDialog());
    elements.descriptionForm.addEventListener("submit", saveDescription);
    elements.organForm.addEventListener("submit", saveOrgan);
    elements.categoryForm.addEventListener("submit", saveCategory);
    elements.deleteOrganButton.addEventListener("click", deleteOrgan);
    elements.deleteCategoryButton.addEventListener("click", deleteCategory);
    elements.descriptionText.addEventListener("input", () => {
      elements.characterCount.textContent = String(elements.descriptionText.value.length);
    });
    elements.searchInput.addEventListener("input", () => {
      state.search = elements.searchInput.value;
      renderDescriptionList();
    });
    elements.exportButton.addEventListener("click", exportBackup);
    elements.importButton.addEventListener("click", () => elements.importInput.click());
    elements.importInput.addEventListener("change", importBackup);
    elements.languageSelect.addEventListener("change", () => void updateLanguage());

    document.addEventListener("click", (event) => {
      const closeButton = event.target.closest("[data-close-dialog]");
      if (closeButton) document.getElementById(closeButton.dataset.closeDialog)?.close();
    });
    for (const dialog of document.querySelectorAll("dialog")) {
      dialog.addEventListener("click", (event) => {
        if (event.target === dialog) dialog.close();
      });
    }
  }

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") return;
    if (changes[STORAGE_KEYS.categories]) state.categories = changes[STORAGE_KEYS.categories].newValue || [];
    if (changes[STORAGE_KEYS.organs]) state.organs = changes[STORAGE_KEYS.organs].newValue || [];
    if (changes[STORAGE_KEYS.descriptions]) state.descriptions = changes[STORAGE_KEYS.descriptions].newValue || [];
    if (changes[STORAGE_KEYS.settings]) {
      state.settings = changes[STORAGE_KEYS.settings].newValue || {};
      refreshStaticUi();
    }
    render();
  });

  (async () => {
    bindEvents();
    await loadData();
    refreshStaticUi();
    render();
  })().catch(() => showToast(tr("options.loadFailed"), "error"));
})();
