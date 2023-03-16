PfP: Pain-free Passwords
========================

**IMPORTANT**: PfP: Pain-free Passwords is no longer being developed. While it might still work for you, no issues will be fixed.

PfP: Pain-free Passwords is a Firefox, Chrome and Opera password manager. Most passwords will be generated for a specific site and account from your master password whenever needed, these passwords are never stored on disk and can be recreated easily if data is lost. For passwords that cannot be changed for some reason, storing the password with the extension data is also supported. All extension data is safely encrypted.

You can get an idea of how PfP works by using the [online version](https://pfp.works/webclient/). Please make sure to read the warnings when using this one!

Installing build prerequisites
------------------------------

In order to build PfP you will need to install [Node.js](https://nodejs.org/) first (Node 15 or higher is required). Additional dependencies are installed using the following command in the extension directory:

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

### Web client

The following command with produce a file with a name like `build-web/pfp-web-n.n.n.zip`:

    npm run build webZip

After unpacking the package, you can open `index.html` in the browser which will give you a slightly feature-reduced version of PfP.

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

### Web client

The following command will create a `build-web` directory:

    npm run build web

You can then open `build-web/index.html` in your browser to test then.

Running unit tests
------------------

This repository contains an extensive test suite for the core functionality. You can run the unit tests using the following command:

    npm test

You can also run an individual unit test file, for example:

    npm test -- --test=masterPassword

Cleaning up the repository
--------------------------

You can run the following command to remove all temporary files that have been generated during build:

    npm run build clean
