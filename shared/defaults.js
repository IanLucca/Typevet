(function initializeTypevetDefaults(globalScope) {
  "use strict";

  const now = "2026-08-28T00:00:00.000Z";
  const legacyDefaultCategoryIds = new Set(["abdome", "urinario", "tireoide", "vascular", "obstetricia"]);

  const categories = [
    { id: "abdome", name: "Abdome", icon: "abdome", color: "#1f7a8c", isBase: true },
    { id: "cervical", name: "Cervical", icon: "cervical", color: "#8058a6", isBase: true },
    { id: "ocular", name: "Ocular", icon: "ocular", color: "#376fc1", isBase: true }
  ];

  const organs = [
    { id: "figado", categoryId: "abdome", name: "Fígado", createdAt: now, updatedAt: now, isSample: true },
    { id: "vesicula-biliar", categoryId: "abdome", name: "Vesícula biliar", createdAt: now, updatedAt: now, isSample: true },
    { id: "rins", categoryId: "abdome", name: "Rins", createdAt: now, updatedAt: now, isSample: true },
    { id: "tireoide", categoryId: "cervical", name: "Tireoide", createdAt: now, updatedAt: now, isSample: true },
    { id: "linfonodos-cervicais", categoryId: "cervical", name: "Linfonodos cervicais", createdAt: now, updatedAt: now, isSample: true },
    { id: "globo-ocular", categoryId: "ocular", name: "Globo ocular", createdAt: now, updatedAt: now, isSample: true },
    { id: "orbita", categoryId: "ocular", name: "Órbita", createdAt: now, updatedAt: now, isSample: true }
  ];

  const sampleDescription = (id, organId, title, subject) => ({
    id,
    organId,
    title,
    text: `Exemplo inicial: substitua este texto pela descrição padronizada de ${subject} utilizada pelo seu serviço.`,
    favorite: false,
    usageCount: 0,
    lastUsedAt: null,
    createdAt: now,
    updatedAt: now,
    isSample: true
  });

  const descriptions = [
    sampleDescription("figado-normal", "figado", "Fígado normal", "fígado normal"),
    sampleDescription("hepatomegalia", "figado", "Hepatomegalia", "hepatomegalia"),
    sampleDescription("vesicula-normal", "vesicula-biliar", "Vesícula normal", "vesícula biliar normal"),
    sampleDescription("rins-normais", "rins", "Rins normais", "rins normais"),
    sampleDescription("tireoide-normal", "tireoide", "Tireoide normal", "tireoide normal"),
    sampleDescription("linfonodos-habituais", "linfonodos-cervicais", "Aspecto habitual", "linfonodos cervicais de aspecto habitual"),
    sampleDescription("globo-ocular-normal", "globo-ocular", "Globo ocular normal", "globo ocular normal"),
    sampleDescription("orbita-normal", "orbita", "Órbita normal", "órbita normal")
  ];

  function detectInitialLanguage() {
    try {
      const uiLanguage = globalScope.chrome?.i18n?.getUILanguage?.();
      return /^en(?:[-_]|$)/i.test(String(uiLanguage || "")) ? "en" : "pt-BR";
    } catch {
      return "pt-BR";
    }
  }

  const defaultSettings = {
    panelSide: "right",
    panelOpen: false,
    showOnAllSites: true,
    showFloatingButton: true,
    language: detectInitialLanguage(),
    fabPosition: null,
    schemaVersion: 2
  };

  const clone = (value) => structuredClone(value);

  function normalizeSearchText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR")
      .trim();
  }

  function matchesDescriptionSearch(description, query) {
    const normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery) return true;
    return normalizeSearchText(`${description?.title || ""} ${description?.text || ""}`)
      .includes(normalizedQuery);
  }

  function cloneDefaults() {
    return {
      categories: clone(categories),
      organs: clone(organs),
      descriptions: clone(descriptions),
      settings: clone(defaultSettings)
    };
  }

  function isUntouchedLegacySampleLibrary(storedCategories, storedDescriptions) {
    return Array.isArray(storedCategories)
      && storedCategories.length > 0
      && storedCategories.every((category) => legacyDefaultCategoryIds.has(category?.id))
      && Array.isArray(storedDescriptions)
      && storedDescriptions.length > 0
      && storedDescriptions.every((description) => description?.isSample === true);
  }

  function migrateStoredData(stored = {}) {
    const storedCategories = stored.sonoCategories;
    const storedOrgans = stored.sonoOrgans;
    const storedDescriptions = stored.sonoDescriptions;
    const storedSettings = stored.sonoSettings;
    const schemaVersion = Number(storedSettings?.schemaVersion) || 1;

    if (
      schemaVersion >= 2
      && Array.isArray(storedCategories)
      && Array.isArray(storedOrgans)
      && Array.isArray(storedDescriptions)
    ) {
      return {
        categories: storedCategories,
        organs: storedOrgans,
        descriptions: storedDescriptions,
        settings: { ...defaultSettings, ...storedSettings },
        didMigrate: false
      };
    }

    const hasStoredLibrary = Array.isArray(storedCategories) || Array.isArray(storedDescriptions);
    if (!hasStoredLibrary || isUntouchedLegacySampleLibrary(storedCategories, storedDescriptions)) {
      return { ...cloneDefaults(), didMigrate: true };
    }

    const migratedCategories = Array.isArray(storedCategories) ? clone(storedCategories) : [];
    for (const baseCategory of categories) {
      if (!migratedCategories.some((category) => category.id === baseCategory.id)) {
        migratedCategories.push(clone(baseCategory));
      }
    }

    const migratedOrgans = Array.isArray(storedOrgans) ? clone(storedOrgans) : [];
    const migratedDescriptions = [];

    for (const legacyDescription of Array.isArray(storedDescriptions) ? storedDescriptions : []) {
      if (legacyDescription?.organId) {
        migratedDescriptions.push(clone(legacyDescription));
        continue;
      }

      const categoryId = migratedCategories.some((category) => category.id === legacyDescription?.categoryId)
        ? legacyDescription.categoryId
        : migratedCategories[0]?.id;
      if (!categoryId) continue;

      const organId = `migrado-${legacyDescription.id || crypto.randomUUID()}`;
      migratedOrgans.push({
        id: organId,
        categoryId,
        name: String(legacyDescription.title || "Órgão migrado"),
        createdAt: legacyDescription.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isSample: Boolean(legacyDescription.isSample)
      });
      const { categoryId: ignoredCategoryId, ...descriptionWithoutCategory } = legacyDescription;
      void ignoredCategoryId;
      migratedDescriptions.push({ ...descriptionWithoutCategory, organId });
    }

    return {
      categories: migratedCategories,
      organs: migratedOrgans,
      descriptions: migratedDescriptions,
      settings: { ...defaultSettings, ...(storedSettings || {}), schemaVersion: 2 },
      didMigrate: true
    };
  }

  globalScope.TYPEVET = Object.freeze({
    STORAGE_KEYS: Object.freeze({
      categories: "sonoCategories",
      organs: "sonoOrgans",
      descriptions: "sonoDescriptions",
      settings: "sonoSettings",
      initialized: "sonoInitialized"
    }),
    DEFAULT_CATEGORIES: categories,
    DEFAULT_ORGANS: organs,
    DEFAULT_DESCRIPTIONS: descriptions,
    DEFAULT_SETTINGS: defaultSettings,
    cloneDefaults,
    detectInitialLanguage,
    normalizeSearchText,
    matchesDescriptionSearch,
    migrateStoredData
  });
})(globalThis);
