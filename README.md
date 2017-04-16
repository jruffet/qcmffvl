QCM FFVL
--------

This is the official web app used by the French paragliding and hang gliding federation for its multiple choice test (part of the pilot license exam).
It includes a training mode and an exam mode.

It works on various browsers (Chrome / Firefox / Safari...), thus various OSes (Linux / Windows / Mac OS...)

### Web App

It is based on angularJS, jquery, and bootstrap (and much more).  
Purely client side, with only static files, designed in a way that they can be loaded directly from the file system (no cross site stuff).

To see how it looks like, you can access the latest stable version at : http://qcm.ffvl.fr/

### Android

The Android app uses a webview on the "web app", adding easiness of use, especially when network data is not available.



## Install
`sudo npm install -g http-server`

## Run


`http-server`
App is available at `http://127.0.0.1:8080/web`