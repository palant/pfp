PfP: Pain-free Passwords
========================

PfP: Pain-free Passwords is a Firefox, Chrome and Opera password manager. It communicates with the [PfP Native Host](https://github.com/palant/pfp-native-host) application via the [native messaging protocol](https://developer.chrome.com/docs/apps/nativeMessaging/), this allows it to use a database file in the KeePass format.

Installing build prerequisites
------------------------------

In order to build PfP you will need to install [Node.js](https://nodejs.org/) first (Node 17 or higher is required). Additional dependencies are installed using the following command in the extension directory:

    npm install

How to build
------------

You can append `-- --dev` to all build commands. This will bundle the development Vue version and result in additional debugging output.

### Firefox

The following command with produce a file with a name like `build-firefox/pfp-n.n.n.xpi`:

    npm run build xpi

### Chrome and Opera

The following command with produce a file with a name like `build-chrome/pfp-n.n.n.zip`:

    npm run build crx

This ZIP file can be uploaded to Chrome Web Store or Opera Add-ons and will be converted into a signed CRX there.

How to test
-----------

### Firefox

The following command will create a `build-firefox` directory:

    npm run build firefox

You can load this directory as a temporary extension in Firefox via `about:debugging` page. An already loaded extension will reload automatically on rebuild. If you want the directory to be updated automatically whenever you change any source files, you can use `npm run build watchFirefox` instead.

### Chrome and Opera

The following command will create a `build-chrome` directory:

    npm run build chrome

You can load this directory as an unpacked extension in Chrome and Opera. An already loaded extension will reload automatically on rebuild. If you want the directory to be updated automatically whenever you change any source files, you can use `npm run build watchChrome` instead.

Cleaning up the repository
--------------------------

You can run the following command to remove all temporary files that have been generated during build:

    npm run build clean
