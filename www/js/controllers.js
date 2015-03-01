angular.module('shoutie.controllers', ['shoutie.services', 'ionic.contrib.ui.cards'])

    .controller('IntroCtrl', function ($scope, $state, $ionicSlideBoxDelegate, $ionicLoading, User) {

        if (window.localStorage["apiKey"]) {
            $state.go('app.main');
        }

        // Called to navigate to the main app
        $scope.startApp = function () {
            $ionicLoading.show({
                template: 'Loading...'
            });

            User.register().then(function (data) {
                $ionicLoading.hide();
                $state.go('app.main');
            }, function (error) {
                $ionicLoading.hide();
                alert('Something bad happened. Please try again later.');
            });

        };

        // Called each time the slide changes
        $scope.slideChanged = function (index) {
            $scope.slideIndex = index;
        };
    })

    .controller('AppCtrl', function ($scope, $ionicModal, $timeout, Geo) {
        // Form data for the login modal
        $scope.loginData = {};

        // Create the login modal that we will use later
        $ionicModal.fromTemplateUrl('templates/login.html', {
            scope: $scope
        }).then(function (modal) {
            $scope.modal = modal;
        });

        // Triggered in the login modal to close it
        $scope.closeLogin = function () {
            $scope.modal.hide();
        };

        // Open the login modal
        $scope.login = function () {
            console.log('SHOW!');
            $scope.modal.show().then(function () {
                //Map Options
                var mapOptions = {
                    zoom: 15,
                    disableDefaultUI: true,
                    mapTypeId: google.maps.MapTypeId.ROADMAP
                };

                $scope.map = new google.maps.Map(document.getElementById("scope-map"), mapOptions);
                console.log(document.getElementById("scope-map"));
            });
        };

        // Perform the login action when the user submits the login form
        $scope.doLogin = function () {
            console.log('Doing login', $scope.loginData);

            // Simulate a login delay. Remove this and replace with your login
            // code if using a login system
            $timeout(function () {
                $scope.closeLogin();
            }, 1000);
        };
    })

    .controller('NewShoutCtrl', function ($scope, $stateParams, Geo, $ionicHistory, Shouts) {
        $scope.formData = {};
        Geo.getLocation().then(function (position) {

            var latLng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
            $scope.map.setCenter(latLng);

            var shoutRadius = {
                strokeColor: '#FF0000',
                strokeOpacity: 0.8,
                strokeWeight: 2,
                fillColor: '#FF0000',
                fillOpacity: 0.35,
                map: $scope.map,
                center: latLng,
                radius: 200
            };
            // Add the circle for this city to the map.
            new google.maps.Circle(shoutRadius);


        }, function (error) {
            alert('Could not get location');
        });


        //Map Options
        var mapOptions = {
            zoom: 16,
            disableDefaultUI: true,
            mapTypeId: google.maps.MapTypeId.ROADMAP
        };

        $scope.map = new google.maps.Map(document.getElementById("map"), mapOptions);

        $scope.doShout = function () {
            if($scope.formData.shoutText) {
                Shouts.addShout($scope.formData.shoutText);
                $ionicHistory.goBack();
            }
            else{
                alert("You need to write something! ");
            }
        }
    })

    .controller('MainCtrl', function ($scope, $state, $ionicSwipeCardDelegate, Geo, $ionicLoading, Shouts, Time) {
        var timeInterval;
        $scope.noShouts = false;

        $ionicLoading.show({
            template: 'Finding Location...',
            delay: 100
        });

        var shouts;
        $scope.cards = [];

        Geo.getLocation().then(function (position) {
            $ionicLoading.show({
                template: 'Listening...'
            });

            Shouts.getShouts(function(){
                if($scope.cards.length === 0){
                    $scope.addCard();
                }
            }).then(function (data) {
                $ionicLoading.hide();
                shouts = data;
                console.log($scope.cards);
            });
        });


        //Array.prototype.slice.call(cardTypes, 0, 0);

        $scope.cardSwiped = function (index) {
            $scope.addCard();
        };

        $scope.cardDestroyed = function (index) {
            Shouts.readShout($scope.cards[index]);
            $scope.cards.splice(index, 1);
        };

        $scope.addCard = function () {
            if (shouts && shouts.length > 0) {
                startTimer();
                $scope.noShouts = false;
                var shout = shouts.shift();
                shout.timeSince = Time.timeSince(new Date(shout.time));
                $scope.cards.push(shout);
            }
            else{
                clearInterval(timeInterval);
                timeInterval = false;
                $scope.noShouts = true;
            }
        };

        function startTimer(){
            if(!timeInterval){
                timeInterval = setInterval(function() {
                    $scope.$apply(function () {
                            $scope.cards[0].timeSince = Time.timeSince(new Date($scope.cards[0].time));
                        });
                }, 1000);
            }
        }

        $scope.newShout = function () {
            $state.go('app.newShout');
        }
    })

    .controller('CardCtrl', function ($scope, $ionicSwipeCardDelegate) {
        $scope.goAway = function () {
            var card = $ionicSwipeCardDelegate.getSwipeableCard($scope);
            card.swipe();
        };
    });


