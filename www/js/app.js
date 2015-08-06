angular.module('shoutie', ['ionic', 'shoutie.controllers', 'ngCordova'])

    .run(function ($ionicPlatform, $state, $cordovaSplashscreen) {
        $ionicPlatform.ready(function () {
            console.log('READY!');

            if (window.localStorage["apiKey"]) {
                $state.go('app.main');
            }
            else {
                $state.go('intro');
            }

            if(window.cordova) {
                $cordovaSplashscreen.hide();
            }

            // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
            // for form inputs)
            if (window.cordova && window.cordova.plugins.Keyboard) {
                cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
            }
        });
    })

    .config(function ($stateProvider, $urlRouterProvider, $ionicConfigProvider) {
        $ionicConfigProvider.navBar.alignTitle("center");
        $ionicConfigProvider.backButton.text('');
        $ionicConfigProvider.backButton.previousTitleText(false);

        $stateProvider

            .state('intro', {
                url: "/intro",
                templateUrl: "templates/intro.html",
                controller: 'IntroCtrl'
            })

            .state('app', {
                url: "/app",
                abstract: true,
                templateUrl: "templates/menu.html",
                controller: 'AppCtrl'
            })

            .state('app.main', {
                url: "/main",
                views: {
                    'menuContent': {
                        templateUrl: "templates/main.html",
                        controller: 'MainCtrl'
                    }
                }
            })

            .state('app.newShout', {
                url: "/newShout",
                views: {
                    'menuContent': {
                        templateUrl: "templates/newShout.html",
                        controller: 'NewShoutCtrl'
                    }
                }
            });
        // if none of the above states are matched, use this as the fallback
        //$urlRouterProvider.otherwise('/intro');
    });
