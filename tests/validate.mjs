import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const root = resolve(testDirectory, "..");
const read = (path) => readFileSync(resolve(root, path), "utf8");

const manifest = JSON.parse(read("manifest.json"));
assert.equal(manifest.manifest_version, 3, "A extensão deve usar Manifest V3");
assert.equal(manifest.name, "__MSG_extensionName__");
assert.equal(manifest.version, "0.7.1");
assert.equal(manifest.default_locale, "pt_BR");
assert.ok(manifest.permissions.includes("storage"));
assert.ok(manifest.permissions.includes("clipboardWrite"));
assert.ok(manifest.permissions.includes("activeTab"));
assert.ok(manifest.permissions.includes("scripting"));
assert.equal(manifest.content_scripts, undefined, "Não deve haver content script automático");
assert.equal(manifest.host_permissions, undefined, "Não deve haver permissões obrigatórias de host");
assert.equal(manifest.optional_host_permissions, undefined, "Não deve haver permissões opcionais amplas de host");
assert.equal(manifest.web_accessible_resources, undefined, "O CSS deve ser injetado sem exposição ampla de recursos");
assert.equal(/https?:\/\/\*\/\*/.test(JSON.stringify(manifest)), false, "O manifesto não pode conter padrões amplos de host");

const referencedFiles = [
  manifest.background.service_worker,
  manifest.options_page,
  ...Object.values(manifest.icons),
  "shared/i18n.js",
  "shared/defaults.js",
  "content/content.js",
  "content/content.css"
];

for (const path of referencedFiles) {
  assert.ok(existsSync(resolve(root, path)), `Arquivo citado no manifest não existe: ${path}`);
}

const ptLocale = JSON.parse(read("_locales/pt_BR/messages.json"));
const enLocale = JSON.parse(read("_locales/en/messages.json"));
assert.equal(ptLocale.extensionName.message, "Typevet");
assert.equal(enLocale.extensionName.message, "Typevet");
assert.ok(enLocale.extensionDescription.message.includes("ultrasound"));
assert.ok(ptLocale.actionTitle.message.includes("nesta página"));
assert.ok(enLocale.actionTitle.message.includes("this page"));

await import(resolve(root, "shared/i18n.js"));
await import(resolve(root, "shared/defaults.js"));
const defaults = globalThis.TYPEVET.cloneDefaults();
assert.ok(defaults.categories.length >= 1);
assert.ok(defaults.organs.length >= 1);
assert.ok(defaults.descriptions.length >= 1);
assert.equal(defaults.settings.fabPosition, null, "A posição inicial do botão deve usar o canto padrão");
assert.equal(defaults.settings.showFloatingButton, true);
assert.equal(defaults.settings.language, "pt-BR");
assert.equal(defaults.settings.theme, "light");
assert.equal(typeof globalThis.TYPEVET.detectInitialLanguage, "function");
assert.equal(globalThis.TYPEVET_I18N.t("en", "common.descriptions"), "Descriptions");
assert.equal(globalThis.TYPEVET_I18N.t("pt-BR", "common.library"), "Biblioteca");
assert.equal(globalThis.TYPEVET_I18N.t("en", "common.library"), "Library");
assert.equal(globalThis.TYPEVET_I18N.t("pt-BR", "panel.hideFab"), "Desativar botão");
assert.equal(globalThis.TYPEVET_I18N.t("en", "panel.hideFab"), "Disable button");
assert.equal(globalThis.TYPEVET_I18N.t("pt-BR", "panel.themeToDark"), "Ativar modo escuro");
assert.equal(globalThis.TYPEVET_I18N.t("en", "panel.themeToLight"), "Enable light mode");
assert.equal(globalThis.TYPEVET_I18N.localizeCategoryName(defaults.categories[0], "en"), "Abdomen");
assert.equal(globalThis.TYPEVET_I18N.localizeOrganName(defaults.organs[0], "en"), "Liver");
const englishSample = globalThis.TYPEVET_I18N.localizeDescription(defaults.descriptions[0], "en");
assert.equal(englishSample.title, "Normal liver");
assert.ok(englishSample.text.includes("standardized normal liver description"));

const translationSources = [read("content/content.js"), read("options/options.js"), read("options/options.html")].join("\n");
const directTranslationKeys = new Set([
  ...[...translationSources.matchAll(/\btr\("([^"]+)"/g)].map((match) => match[1]),
  ...[...translationSources.matchAll(/data-i18n(?:-placeholder|-title|-aria-label)?="([^"]+)"/g)].map((match) => match[1])
]);
for (const key of directTranslationKeys) {
  assert.notEqual(globalThis.TYPEVET_I18N.t("pt-BR", key), key, `Tradução PT ausente: ${key}`);
  assert.notEqual(globalThis.TYPEVET_I18N.t("en", key), key, `Tradução EN ausente: ${key}`);
}
const pluralTranslationKeys = new Set(
  [...translationSources.matchAll(/\btrPlural\("([^"]+)"/g)].map((match) => match[1])
);
for (const key of pluralTranslationKeys) {
  assert.notEqual(globalThis.TYPEVET_I18N.plural("pt-BR", key, 1), `${key}.one`, `Plural PT ausente: ${key}`);
  assert.notEqual(globalThis.TYPEVET_I18N.plural("en", key, 2), `${key}.other`, `Plural EN ausente: ${key}`);
}

const categoryIds = new Set(defaults.categories.map((category) => category.id));
assert.equal(categoryIds.size, defaults.categories.length, "IDs de categorias devem ser únicos");
assert.deepEqual([...categoryIds].sort(), ["abdome", "cervical", "ocular"], "Somente as três categorias-base devem vir instaladas");
const organIds = new Set(defaults.organs.map((organ) => organ.id));
assert.equal(organIds.size, defaults.organs.length, "IDs de órgãos devem ser únicos");
for (const organ of defaults.organs) {
  assert.ok(categoryIds.has(organ.categoryId), `Categoria ausente para o órgão ${organ.name}`);
}
for (const description of defaults.descriptions) {
  assert.ok(organIds.has(description.organId), `Órgão ausente para ${description.title}`);
  assert.ok(description.title.trim());
  assert.ok(description.text.trim());
  assert.equal(description.isSample, true, "O conteúdo inicial precisa ser identificado como exemplo");
}
const liver = defaults.organs.find((organ) => organ.id === "figado");
const liverDescriptions = defaults.descriptions.filter((description) => description.organId === liver?.id);
assert.ok(liverDescriptions.length >= 2, "Um órgão deve aceitar várias descrições");
assert.ok(liverDescriptions.some((description) => description.title === "Fígado normal"));
assert.ok(liverDescriptions.some((description) => description.title === "Hepatomegalia"));
assert.equal(globalThis.TYPEVET.matchesDescriptionSearch(liverDescriptions[1], "hepatomegália"), true);
assert.equal(globalThis.TYPEVET.matchesDescriptionSearch(liverDescriptions[0], "descrição padronizada"), true);
assert.equal(globalThis.TYPEVET.matchesDescriptionSearch(liverDescriptions[0], "carótidas"), false);

const optionsHtml = read("options/options.html");
const englishReadme = read("README.en.md");
assert.ok(optionsHtml.includes("Typevet"));
assert.ok(englishReadme.includes("Disable button"));
assert.equal(/sonotexto/i.test(optionsHtml), false, "A interface ainda contém a marca anterior");
const ids = [...optionsHtml.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
assert.equal(new Set(ids).size, ids.length, "IDs duplicados na página de gerenciamento");
for (const requiredId of [
  "categoryNav",
  "descriptionList",
  "newDescriptionButton",
  "newOrganButton",
  "descriptionDialog",
  "descriptionOrgan",
  "organDialog",
  "categoryDialog",
  "importInput",
  "languageSelect",
  "themeSelect"
]) {
  assert.ok(ids.includes(requiredId), `Elemento obrigatório ausente: ${requiredId}`);
}
assert.equal(ids.includes("showFabToggle"), false, "O toggle redundante não deve aparecer no gerenciador");
assert.equal(ids.includes("categoryIcon"), false, "A criação de categoria não deve pedir um ícone");
assert.equal(/\son[a-z]+\s*=/i.test(optionsHtml), false, "Não use manipuladores inline");

const legacy = globalThis.TYPEVET.migrateStoredData({
  sonoCategories: [{ id: "personalizada", name: "Personalizada", icon: "generic", color: "#123456" }],
  sonoDescriptions: [{
    id: "legado",
    categoryId: "personalizada",
    title: "Texto antigo",
    text: "Conteúdo preservado",
    favorite: true,
    isSample: false
  }],
  sonoSettings: { schemaVersion: 1 }
});
assert.equal(legacy.didMigrate, true);
assert.equal(legacy.descriptions[0].text, "Conteúdo preservado");
assert.ok(legacy.organs.some((organ) => organ.id === legacy.descriptions[0].organId));
assert.equal(legacy.settings.schemaVersion, 2);

const existingV2 = globalThis.TYPEVET.migrateStoredData({
  sonoCategories: defaults.categories,
  sonoOrgans: defaults.organs,
  sonoDescriptions: defaults.descriptions,
  sonoSettings: { schemaVersion: 2, fabPosition: { xRatio: 0.4, yRatio: 0.6 } }
});
assert.equal(existingV2.didMigrate, false);
assert.equal(existingV2.settings.showFloatingButton, true, "Usuários atuais devem receber o botão ativo por padrão");
assert.equal(existingV2.settings.language, "pt-BR", "Usuários atuais devem iniciar em português");
assert.equal(existingV2.settings.theme, "light", "Usuários atuais devem iniciar no tema claro");
assert.deepEqual(existingV2.settings.fabPosition, { xRatio: 0.4, yRatio: 0.6 });

for (const file of [
  "shared/i18n.js",
  "shared/defaults.js",
  "background/service-worker.js",
  "content/content.js",
  "options/options.js"
]) {
  const check = spawnSync(process.execPath, ["--check", resolve(root, file)], { encoding: "utf8" });
  assert.equal(check.status, 0, `Erro de sintaxe em ${file}: ${check.stderr}`);
}

for (const file of ["content/content.js", "options/options.js", "background/service-worker.js"]) {
  const source = read(file);
  assert.equal(/https?:\/\//.test(source), false, `Código inesperadamente acessa a internet: ${file}`);
}

const floatingPanelSource = read("content/content.js");
const serviceWorkerSource = read("background/service-worker.js");
assert.ok(floatingPanelSource.includes('data-role="organ-search"'), "A pesquisa por órgão não foi renderizada");
assert.ok(floatingPanelSource.includes("matchesDescriptionSearch"));
assert.ok(floatingPanelSource.includes('data-role="quick-add-form"'), "O cadastro rápido não foi renderizado no painel");
assert.ok(floatingPanelSource.includes('data-role="quick-add-organ-form"'), "O cadastro rápido de órgão não foi renderizado no painel");
assert.ok(floatingPanelSource.includes("saveQuickOrgan"), "O painel não salva novos órgãos");
assert.ok(floatingPanelSource.includes("pointerdown"), "O botão flutuante não possui início de arraste");
assert.ok(floatingPanelSource.includes("persistFabPosition"), "A posição do botão não é persistida");
assert.ok(floatingPanelSource.includes("fabPosition"), "A posição salva do botão não é aplicada");
assert.ok(floatingPanelSource.includes("toggle-fab-visibility"), "O painel não permite ocultar o botão flutuante");
assert.ok(floatingPanelSource.includes('data-action="library"'), "A Biblioteca não aparece como primeira opção do painel");
assert.ok(floatingPanelSource.includes("function renderLibrary()"), "A visualização Biblioteca não foi implementada");
const homeViewStart = floatingPanelSource.indexOf("function renderHome()");
const libraryCardPosition = floatingPanelSource.indexOf("${renderLibraryCard()}", homeViewStart);
const categoryCardsPosition = floatingPanelSource.indexOf("${state.categories.map(renderCategoryCard)", homeViewStart);
assert.ok(homeViewStart >= 0 && libraryCardPosition > homeViewStart, "A Biblioteca não foi adicionada à tela inicial");
assert.ok(libraryCardPosition < categoryCardsPosition, "A Biblioteca deve ser a primeira opção do painel");
assert.ok(floatingPanelSource.includes("toggle-language"), "O painel não permite alternar o idioma");
assert.ok(floatingPanelSource.includes("toggle-theme"), "O painel não permite alternar o tema");
assert.ok(floatingPanelSource.includes("activeModalDialog"), "O painel não trata páginas com diálogo modal em evidência");
assert.ok(floatingPanelSource.includes('.modal.show'), "O painel não reconhece modais Bootstrap em evidência");
assert.ok(floatingPanelSource.includes("ngb-modal-window"), "O painel não reconhece modais Angular em evidência");
assert.ok(floatingPanelSource.includes('data-role="favorites-bar"'), "A barra de favoritos não foi renderizada");
assert.ok(floatingPanelSource.includes("renderFavoritesBar"), "A barra de favoritos não é atualizada");
assert.ok(floatingPanelSource.includes('"class", "style", "aria-hidden", "aria-modal"'), "Mudanças de camada modal não são acompanhadas");
assert.ok(floatingPanelSource.includes('"z-index": "2147483647"'), "O host do painel não recebe prioridade visual máxima");
assert.ok(floatingPanelSource.includes("protectEventsFromHostPage"), "Eventos do painel podem vazar para a página hospedeira");
assert.ok(floatingPanelSource.includes("TYPEVET_BOOTSTRAP"), "O painel não recebe a inicialização sob demanda");
assert.ok(floatingPanelSource.includes("TYPEVET_OPEN_PANEL"), "O painel não responde ao clique no ícone");
assert.ok(serviceWorkerSource.includes("chrome.scripting.executeScript"), "A interface não é injetada com scripting");
assert.ok(serviceWorkerSource.includes('chrome.runtime.getURL("content/content.css")'), "O CSS local não é carregado pelo service worker");
assert.ok(serviceWorkerSource.includes("TYPEVET_OPEN_PANEL"), "O service worker não reabre um painel existente");
assert.ok(serviceWorkerSource.includes("TYPEVET_BOOTSTRAP"), "O service worker não inicializa o painel injetado");
assert.equal(/https?:\/\/\*\/\*/.test(serviceWorkerSource), false, "O service worker contém padrão amplo de host");
assert.ok(optionsHtml.includes('data-i18n="options.heroTitle"'), "O gerenciador não possui tradução estrutural");
assert.ok(read("options/options.js").includes("ALLOWED_ICONS.has(existing?.icon) ? existing.icon : \"generic\""), "Editar uma categoria deve preservar seu ícone interno");

const originalChrome = globalThis.chrome;
const originalFetch = globalThis.fetch;
let actionClickHandler;
let messageMode = "missing";
let optionsOpenCount = 0;
const executeScriptCalls = [];

globalThis.chrome = {
  storage: {
    local: {
      get: async () => ({}),
      set: async () => undefined
    }
  },
  runtime: {
    getURL: (path) => `chrome-extension://typevet/${path}`,
    openOptionsPage: async () => { optionsOpenCount += 1; },
    onInstalled: { addListener: () => undefined },
    onStartup: { addListener: () => undefined },
    onMessage: { addListener: () => undefined }
  },
  action: {
    onClicked: {
      addListener: (handler) => { actionClickHandler = handler; }
    }
  },
  tabs: {
    sendMessage: async () => {
      if (messageMode === "missing") throw new Error("no-receiver");
      return { handled: true };
    }
  },
  scripting: {
    executeScript: async (options) => { executeScriptCalls.push(options); }
  }
};
globalThis.fetch = async () => ({
  ok: true,
  status: 200,
  text: async () => ":host{all:initial}"
});

try {
  await import(resolve(root, "background/service-worker.js"));
  assert.equal(typeof actionClickHandler, "function", "O clique no ícone não foi registrado");

  await actionClickHandler({ id: 42 });
  assert.equal(executeScriptCalls.length, 2, "A ativação deve preparar o CSS e injetar os scripts");
  assert.equal(typeof executeScriptCalls[0].func, "function", "A primeira injeção deve preparar a inicialização");
  assert.deepEqual(executeScriptCalls[0].target, { tabId: 42 });
  assert.deepEqual(executeScriptCalls[1].files, [
    "shared/i18n.js",
    "shared/defaults.js",
    "content/content.js"
  ]);

  messageMode = "existing";
  await actionClickHandler({ id: 42 });
  assert.equal(executeScriptCalls.length, 2, "Um painel existente deve apenas ser reaberto");

  await actionClickHandler({});
  assert.equal(optionsOpenCount, 1, "Sem uma guia injetável, o gerenciador deve ser aberto");
} finally {
  globalThis.chrome = originalChrome;
  globalThis.fetch = originalFetch;
}

console.log("✓ Manifesto, arquivos, dados iniciais, HTML e JavaScript validados.");
