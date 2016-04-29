Easy Passwords
==============

Easy Passwords is Firefox, Chrome and Opera extension that allows generating secure site-specific passwords for all websites from a single master password. It keeps track of the parameters used to generate these passwords, but the passwords themselves are never stored. You can always generate them again if you have the master password, but without the master password the data stored by this extension is useless.

Legacy passwords that you cannot change can also be stored securely in this extension, these will be encrypted using your master password and cannot be decrypted without knowing the master password.

If you need to generate one of your passwords and cannot use Easy Passwords, there is an [online version](https://palant.github.io/easypasswords/online.html) available. Please make sure to read the warnings when using this one!

Installing build prerequisites
------------------------------

In order to build EasyPasswords you will need to install [Node.js](https://nodejs.org/) first. You will also need [Gulp](http://gulpjs.com/), run the following command to install it (administrator privileges required):

    npm install --global gulp-cli

Additional dependencies are installed using the following command in the extension directory:

    npm install

How to build
------------

If all the dependencies are installed, building EasyPasswords for Firefox is simply a matter of running Gulp:

    gulp xpi

This will create a package inside the `build-jpm` directory with the file name like `easypasswords@palant.de-n.n.n.xpi` that you can install in Firefox.

Creating a Chrome and Opera build is similar:

    gulp crx --private-key=key.pem

This will create a package inside the `build-chrome` directory with the file name like `easypasswords.de-n.n.n.crx` that you can install in Chrome and Opera. If you don't specify a signing key it will create a ZIP file as required by Chrome Web Store.

How to test in Firefox
----------------------

Testing your changes is easiest if you install the [Extension Auto-Installer extension](https://addons.mozilla.org/addon/autoinstaller/). Then you can push the current repository state to your browser using the following command:

    gulp post

This will install Easy Passwords in your browser automatically, without any prompts or browser restarts. If you changed the port that Extension Auto-Installer is listening to you will have to specify it on the command line:

    gulp post --post-url=7777

If you want to test on another computer you can specify a host as well:

    gulp post --post-url=device.localdomain:8888

You can also make Gulp watch the repository for changes and reinstall Easy Passwords whenever some file changes:

    gulp watch

Here you can use the same `--post-url` parameter as with `gulp post`.

How to test in Chrome and Opera
-------------------------------

You can create a test directory by running the following command:

    gulp build-chrome

This will create a `build-chrome` directory that you can load as an unpacked extension in Chrome or Opera. If you change something you can rerun the command and reload the extension in the browser then.

Cleaning up the repository
--------------------------

You can run the following command to remove all temporary files that have been generated during build:

    gulp clean
