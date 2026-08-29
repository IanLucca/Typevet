# Typevet

Extensão para consultar e copiar suas descrições personalizadas sem sair da página em uso.

English instructions: see `README.en.md`.

## O que já funciona

- Ativação somente após o usuário clicar no ícone do typevet na guia atual;
- Uso de `activeTab`, sem permissão permanente para todos os sites;
- Botão flutuante arrastável na página ativada, com a posição salva;
- Controle para desativar ou reativar o botão flutuante quando desejado;
- Interface bilíngue em português e inglês, com idioma sincronizado entre painel e gerenciador;
- Acesso **Biblioteca** como primeira opção do painel, reunindo todos os órgãos e descrições;
- Navegação por mouse em categorias, órgãos e descrições;
- Pesquisa instantânea dentro de cada órgão pelo título ou conteúdo da descrição;
- Cadastro rápido de uma nova descrição diretamente pelo painel flutuante;
- Pré-visualização antes da cópia;
- Cópia com um clique;
- Favoritos e itens usados recentemente;
- Cadastro, edição e exclusão de categorias, órgãos e descrições;
- Busca na tela de gerenciamento;
- Importação e exportação de backup em JSON;
- Contadores de descrições, categorias, favoritos e cópias;
- Dados armazenados localmente no navegador, sem servidor externo.

As únicas categorias iniciais são **Abdome**, **Cervical** e **Ocular**. O usuário pode criar quantas categorias e órgãos quiser. Cada órgão agrupa diversas descrições — por exemplo: `Abdome → Fígado → Fígado normal / Hepatomegalia`.

Os textos incluídos na primeira instalação são apenas exemplos identificados na interface. Substitua-os pelos modelos validados pelo serviço antes do uso profissional.

## Instalação para desenvolvimento

1. Descompacte o arquivo do projeto.
2. Abra `chrome://extensions` no Chrome.
3. Ative **Modo do desenvolvedor** no canto superior direito.
4. Clique em **Carregar sem compactação**.
5. Selecione a pasta `typevet-extension` que contém o arquivo `manifest.json`.
6. Abra uma página comum e clique no ícone do typevet na barra do Chrome. O painel será ativado e aberto nessa guia.

O acesso é temporário e limitado à guia acionada. Após recarregar a página, fechar a guia ou navegar para outro site, clique novamente no ícone para reativar o typevet. Se a página for protegida pelo navegador, o gerenciador será aberto no lugar.

## Uso

1. Clique no ícone do typevet para ativar e abrir o painel na página atual.
2. Arraste o botão **Descrições** para deixá-lo na posição mais confortável da tela.
3. Clique em **Nova descrição** no rodapé do painel para cadastrar rapidamente um texto.
4. Use o botão **PT/EN** no cabeçalho para alternar o idioma de toda a interface. Em uma instalação nova, o typevet inicia em inglês quando esse é o idioma do Chrome; nos demais casos, inicia em português.
5. Clique em **Desativar botão** quando não quiser mantê-lo visível na página. O painel continua acessível pelo ícone do typevet.
6. Use **Gerenciar** quando quiser criar categorias ou órgãos e fazer edições mais completas.
7. Abra **Biblioteca** para ver todos os órgãos ou entre diretamente em uma categoria; depois escolha a descrição e clique em **Copiar descrição**.

O seletor de idioma traduz a interface e os exemplos iniciais. As descrições personalizadas permanecem exatamente como foram escritas; o typevet não altera nem traduz automaticamente os textos clínicos do usuário.

O painel só é injetado após uma ação explícita do usuário. Ele não pode ser ativado em páginas internas do Chrome, na Chrome Web Store ou em outras telas protegidas pelo navegador.

## Privacidade

O typevet não faz requisições de rede e usa `chrome.storage.local`. O acesso à página é temporário, concedido por `activeTab` somente após o clique do usuário. Os dados são removidos se a extensão for desinstalada, então mantenha backups JSON. Evite armazenar nomes, documentos ou outros identificadores de pacientes nas descrições.

## Estrutura

```text
manifest.json                 Configuração Manifest V3
background/service-worker.js Inicialização e ativação sob demanda
content/                      Botão e painel injetados na guia ativa
options/                      Gerenciador da biblioteca
shared/defaults.js            Estrutura e exemplos iniciais
shared/i18n.js                Traduções e localização dos exemplos
_locales/                     Nome e descrição localizados no Chrome
assets/                       Ícones da extensão
tests/validate.mjs            Validações estáticas e de integridade
```

## Validação local

Com Node.js instalado, execute:

```bash
npm test
```
