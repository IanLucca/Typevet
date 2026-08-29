# TypeVet

A Google Chrome extension designed to streamline the use of standardized descriptions while writing reports.

**TypeVet** allows users to organize reusable texts by categories and organs, search descriptions, mark content as favorite, and quickly copy it for use in web-based clinical systems.

The extension also provides a floating panel directly on the page being used by the professional, reducing the need to switch between tabs or external documents.

> **Disclaimer:** TypeVet is an independent tool. 

## Features

- Organization of descriptions by **categories** and **organs**
- Creation of new descriptions
- Editing and management of stored texts
- Search by title and content
- Favorite descriptions
- Recently used descriptions
- Quick copy to clipboard
- Floating panel available directly on compatible web pages
- Movable floating button
- Persistent floating button position
- Local import and management of descriptions
- Local storage using the Chrome Storage API
- 
## How It Works

Stored texts are organized locally in a structure similar to:

```text
Category
└── Organ
    ├── Description 1
    ├── Description 2
    └── Description 3
```

When a compatible page is opened, TypeVet injects a floating button into the interface.

From the floating panel, the user can:

1. browse categories;
2. select an organ;
3. search for a description;
4. preview the text;
5. copy it to the clipboard;
6. create new descriptions without leaving the current page.

## Technologies

- JavaScript
- HTML
- CSS
- Chrome Extensions API
- Manifest V3
- Chrome Storage API
- Clipboard API

The main interface does not rely on external frameworks or libraries.

## Development Installation

### 1. Download the project

Clone this repository or download the source files.

### 2. Open the Chrome Extensions page

Enter the following address in Chrome:

```text
chrome://extensions
```

### 3. Enable Developer Mode

Enable **Developer mode** in the top-right corner.

### 4. Load the extension

Click **Load unpacked** and select the project root directory, which is the folder containing:

```text
manifest.json
```

### 5. Reload the target page

After installing or updating the extension, reload the web page where you want to use TypeVet.

## Updating the Extension During Development

Whenever you modify the extension files:

1. open `chrome://extensions`;
2. find TypeVet;
3. click **Reload**;
4. return to the page where you are testing it;
5. press `F5`.

Content scripts that are already loaded on a page may continue using an older version of the code until the page itself is reloaded.

## Data and Privacy

TypeVet stores descriptions and settings locally using `chrome.storage.local`.

The extension is not designed to send stored descriptions to a TypeVet-owned external server.

Do not commit the following content to the repository:

- patient information;
- owner information;
- credentials;
- authentication tokens;
- cookies;
- private clinic information;
- exports containing sensitive data;
- screenshots containing real data unless properly anonymized.

## Permissions

### `storage`

Used to store local data such as:

- categories;
- organs;
- descriptions;
- favorites;
- settings;
- floating button position;
- usage information required by the interface.

### `clipboardWrite`

Used to copy a selected description to the clipboard when requested by the user.

### Host permission

Used to allow the content script to run on compatible pages and provide the floating TypeVet interface while the user is working.

## Project Structure

The exact structure may change between versions, but the main components are organized similarly to:

```text
TypeVet/
│
├── manifest.json
├── README.md
├── content/
│   ├── content.js
│   └── content.css
├── options/
│   └── ...
├── icons/
│   └── ...
├── _locales/
│   └── ...
└── ...
```

### `manifest.json`

Defines the extension configuration, permissions, scripts, resources, and metadata used by Chrome.

### `content/content.js`

Responsible for the interface injected into the page, including:

- the floating button;
- the descriptions panel;
- navigation between categories and organs;
- search;
- copying descriptions;
- favorites;
- quick description creation;
- communication with local storage.

### `content/content.css`

Contains the styles used by the interface displayed directly over the host page.

### Management Interface

Responsible for managing stored categories, organs, and descriptions.

## Project Status

TypeVet is currently under development.

The interface, data model, permissions, and compatibility behavior may change before a stable release.

## Purpose

The goal of TypeVet is to reduce repetitive work related to writing standardized descriptions during veterinary ultrasound workflows by keeping reusable text organized and quickly accessible from within the browser.

## Contributing

For larger changes, it is recommended to create a separate branch and test the extension before merging changes into the main branch.

Example branch names:

```text
feature/improved-search
fix/modal-focus
feature/import
```

Example commit messages:

```text
feat: add quick description creation
fix: prevent modal focus conflicts
fix: improve clipboard fallback
docs: update project README
```

## License

No license has been defined for this project yet.

If the repository is made publicly available as open-source software, a license should be explicitly selected before allowing redistribution or modification by third parties.
