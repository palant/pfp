PfP - Pain-free Passwords
=========================

PfP - Pain-free Passwords is a Firefox, Chrome, Opera and Edge password manager. Most passwords will be generated for a specific site and account from your master password whenever needed, these passwords are never stored on disk and can be recreated easily if data is lost. For passwords that cannot be changed for some reason, storing the password with the extension data is also supported. All extension data is safely encrypted.

If you need to generate one of your passwords and cannot use PfP, there is an [online version](https://palant.github.io/easypasswords/online.html) available. Please make sure to read the warnings when using this one!

Installing build prerequisites
------------------------------

In order to build PfP you will need to install [Node.js](https://nodejs.org/) first (Node 7 or higher is required). You will also need [Gulp](http://gulpjs.com/), run the following command to install it (administrator privileges required):

    npm install --global gulp-cli

Additional dependencies are installed using the following command in the extension directory:

    npm install

How to build
------------

If all the dependencies are installed, building PfP for Firefox is simply a matter of running Gulp:

    gulp xpi

This will create a package inside the `build-firefox` directory with the file name like `pfp-n.n.n.xpi` that you can install in Firefox.

Creating a Chrome and Opera build is similar:

    gulp crx --private-key=key.pem

This will create a package inside the `build-chrome` directory with the file name like `pfp-n.n.n.crx` that you can install in Chrome and Opera. If you don't specify a signing key it will create a ZIP file that can be uploaded to Chrome Web Store or Opera Add-ons.

How to test
-----------

Testing your changes is easiest by creating a test directory. For Firefox you should use the following command:

    gulp build-firefox

This will create a `build-firefox` directory that you can load as a temporary extension in Firefox via `about:debugging` page. If you want the directory to be updated automatically whenever you change any source files, you can use `gulp watch-firefox` instead, then you will only have to reload the extension in the browser.

Similarly, creating a test directory for Chrome and Opera can be done by running the following command:

    gulp build-chrome

This will create a `build-chrome` directory that you can load as an unpacked extension in Chrome or Opera. Running `gulp watch-chrome` instead will update the test directory automatically whenever you change any source files.

Cleaning up the repository
--------------------------

You can run the following command to remove all temporary files that have been generated during build:

    gulp clean
