angular.module('shoutie.controllers', ['shoutie.services', 'ionic.contrib.ui.cards', 'easypiechart'])

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

    .controller('AppCtrl', function ($scope, $ionicModal, $timeout, Geo, User) {
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

        $scope.logout = function(){
            User.logout();
        }
    })

    .controller('NewShoutCtrl', function ($scope, $stateParams, Geo, $ionicHistory, Shouts) {
        $scope.formData = {};
        $scope.formData.shoutText = "";
        var latLng;

        Geo.getLocation().then(function (position) {

            latLng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
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
        var firstTime = false;
        $scope.items = [];
        $scope.cards = [];
    
        startTimer();
    
        if(!window.localStorage['turorialDone']){
            firstTime = true;
            
            addShout({
                text:"Hey",
                admin:true,
                local:true,
                time:new Date()
            });
            
            setTimeout(function(){
                addShout({
                    text:"Shoutie lets u see what people are talking about around you",
                    admin:true,
                    local:true,
                    time:new Date()
                });
                
                setTimeout(function(){
                    addShout({
                        text:"Click me to see more",
                        admin:true,
                        local:true,
                        time:new Date()
                    });
                },2000);
            },2000);
        }
        else{
            $ionicLoading.show({
                template: 'Finding Location...',
                delay: 100
            });
        }

        Geo.getLocation().then(function (position) {
            $ionicLoading.hide();

            Shouts.getShouts(function(data,reset){
                //Callback that will be called on new shout
                if(reset){
                    console.log('RESET CARDS');
                }
                if(isFinite(data)){
                    $scope.listeners = data;
                }
                else{
                    addShout(data);
                }
            }).then(function (data) {
                if(data.length === 0 && $scope.items.length === 0){
                    $scope.noShouts = true;   
                }
                else if(data.length > 0){
                    data.forEach(function(shout) {
                        addShout(shout);
                    });
                    console.log("Cards: "+$scope.cards);
                }
                
            }, function(status){
                $ionicLoading.hide();
            });
        });
        
        function addShout(shout){
            $scope.noShouts = false; 
            $scope.items.push(shout);
            $scope.noShouts = false;
            shout.timeSince = Time.timeSince(new Date(shout.time));
            shout.timeLeft = 60;
            shout.percent = 100;
            shout.options = { animate:false, scaleColor:false, lineWidth:2, lineCap:'butt', size: 28 };
            var color = window.randomColor({luminosity: 'bright'}); 
            if(shout.admin){
                shout.color = {'background-color': '#ef473a'}   
            }
            if(!shout.color){
                shout.color = {'background-color':color};
            }
        }
        
        $scope.removeShout = function(shout){
            $scope.items.splice($scope.items.indexOf(shout),1);
            if($scope.cards.indexOf(shout) >= 0)
                $scope.cards.splice($scope.cards.indexOf(shout),1);

            if(!shout.read){
                Shouts.readShout(shout);
            }
            if($scope.items.length === 0){
                $scope.noShouts = true;
            }
        }
        
        $scope.openCard = function(item){
            $scope.cards.splice(0, 1);
            $scope.cards.push(item);
            if(!item.read){
                Shouts.readShout(item);
            }
        }

        $scope.addCard = function () {
            console.log('Add Card.');
            if ($scope.items) {
                $scope.noShouts = false;
                var shout = $scope.items.shift();
                startTimer(shout);
                shout.timeSince = Time.timeSince(new Date(shout.time));
                $scope.cards.push(shout);

                //Get the updated views
                Shouts.update(shout).then(function(newShout){
                    shout['views'] = newShout['views'];
                });
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
                    $scope.items.forEach(function(shout){
                        $scope.$apply(function () {
                            shout.timeSince = Time.timeSince(new Date(shout.time));
                            shout.timeLeft--;
                            shout.percent = shout.timeLeft/60 * 100;
                            //Remove after being shown for 60 seconds
                            if(shout.timeLeft <= 0){
                                $scope.removeShout(shout);
                            }
                        });
                    });
                }, 1000);
            }
        }

        $scope.newShout = function () {
            $state.go('app.newShout');
        }
        
        $scope.reshout = function () {
            if ($scope.cards.length > 0){
                Shouts.reshout($scope.cards[0]).then(function(data){

                });
            }
        }
    })

    .controller('CardCtrl', function ($scope, $ionicSwipeCardDelegate) {
        $scope.goAway = function () {
            var card = $ionicSwipeCardDelegate.getSwipeableCard($scope);
            card.swipe();
        };
    });


