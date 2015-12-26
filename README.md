Easy Passwords
==============

Easy Passwords is a Firefox extension that allows generating secure site-specific passwords for all websites from a single master password. It keeps track of the parameters used to generate these passwords, but the passwords themselves are never stored. You can always generate them again if you have the master password, but without the master password the data stored by this extension is useless.

Legacy passwords that you cannot change can also be stored securely in this extension, these will be encrypted using your master password and cannot be decrypted without knowing the master password.

How to build
------------

You need [jpm](https://developer.mozilla.org/en-US/Add-ons/SDK/Tools/jpm) to build EasyPasswords. Run the following command:

    jpm xpi

This will create a package with the file name like `easypasswords@palant.de-n.n.n.xpi` that you can install in Firefox.

How to test
-----------

Testing your changes is easiest if you install the [Extension Auto-Installer extension](https://addons.mozilla.org/addon/autoinstaller/). Then you can push the current repository state to your browser using the following command:

    jpm post --post-url http://localhost:8888/

This will install Easy Passwords in your browser automatically, without any prompts or browser restarts. You can also ask jpm to reinstall the extension whenever changes in the current directory are detected:

    jpm watchpost --post-url http://localhost:8888/
