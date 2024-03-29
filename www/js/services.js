'use strict';

angular.module('shoutie.services', ['ngResource'])

    .factory('Constants', function(){
        //var url = 'http://45.55.192.51:8081';
        //var url = 'http://ec2-54-69-118-116.us-west-2.compute.amazonaws.com:8081';
        //var url = 'http://192.168.1.152:8081';
        var url = 'http://localhost:8080';
        //var url = 'http://54.209.191.176:80';
        var apiPath = '/api';

        return{
            getUrl: function() { return url+apiPath; },
            getRootUrl: function() { return url; }
        };
    })

    .factory('Shouts', function ($q, $http, User, Geo, Socket, $rootScope, Constants) {
        var shouts = [];
        var notifyCallback;
        var readShouts = [];

        if(typeof window.localStorage["readShouts"] !== 'undefined'){
            readShouts = angular.fromJson(window.localStorage["readShouts"]);
            console.log('REad Shouts from window: '+readShouts)
        }

        function listenForShouts() {
            Socket.open().then(function(){
                Socket.onNewShout(function (data) {
                    shouts.push(data);
                    $rootScope.$apply(function () {
                        notifyCallback(data);
                    });
                    console.log('Got new Shout!');
                });
                Socket.onListenersChange(function (data) {
                    $rootScope.$apply(function () {
                        notifyCallback(data);
                    });
                });
            });
        }

        return {
            getShouts: function(cb){
                notifyCallback = cb;
                var q = $q.defer();

                Geo.getLocation().then(function(position) {
                    var lat = position.coords.latitude;
                    var lng = position.coords.longitude;

                    $http.get(Constants.getUrl() + '/shouts?apiKey=' + User.apiKey() + '&lng=' + lng + '&lat=' + lat)
                        .success(function (data) {
                            console.log("Got "+data.length+ " shouts");

                            data.forEach(function(shout){
                               if(readShouts.indexOf(shout.id) < 0){
                                   shouts.push(shout);
                               }
                            });
                            console.log(shouts.length+ " unread");
                            q.resolve(shouts);

                            listenForShouts();

                        }).error(function (data, status, headers, config) {
                            console.log(status);
                            if(status === 401){
                                console.log('Got 401...');
                                User.logout();
                            }
                            q.reject(status);
                        });
                }, function(err){
                    q.reject(err);
                });
                return q.promise;
            },
            addShout: function(shoutText){
                var q = $q.defer();
                Geo.getLocation().then(function(position){
                    var shout = {
                        text: shoutText,
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };

                    $http.post(Constants.getUrl() + '/shouts?apiKey=' + User.apiKey(), shout)
                        .success(function (data) {
                            q.resolve(data);
                            //notifyCallback();
                        }).error(function (data, status, headers, config) {
                            q.reject(status);
                        });
                }, function(err){
                    q.reject(err);
                });
                return q.promise;
            },
            update: function(shout){
                var q = $q.defer();

                $http.get(Constants.getUrl() + '/shouts/'+shout.id+'?apiKey=' + User.apiKey())
                    .success(function (data) {
                        console.log("Got updated shout for: "+shout.text);
                        var newShout = data;
                        newShout.dis = shout.dis;
                        q.resolve(newShout);
                        notifyCallback(newShout);
                    }).error(function (data, status, headers, config) {
                        q.reject(status);
                    });
                return q.promise;
            },
            readShout: function(shout){
                if(shout.local){
                    return;
                }
                readShouts.push(shout.id);
                window.localStorage["readShouts"] = angular.toJson(readShouts);

                $http.post(Constants.getUrl()+'/shouts/read?apiKey=' + User.apiKey(), {id : shout.id})
                    .success(function(data){
                        console.log("Read Shout "+data);
                        shout.read = true;
                    }).error(function(err){
                        console.log("Error reading Shout "+err);
                    });
            },
            reshout: function(shout){
                var q = $q.defer();
                Geo.getLocation().then(function(position){
                    var post = {
                        id: shout.id,
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };

                    $http.post(Constants.getUrl() + '/shouts/reshout?apiKey=' + User.apiKey(), post)
                        .success(function (data) {
                            console.log(data);
                            q.resolve(data);
                        }).error(function (data, status, headers, config) {
                            q.reject(status);
                            console.log(status);
                        });
                }, function(err){
                    q.reject(err);
                });
                return q.promise;
            },
            changeLocation: function(){

                Geo.getLocation().then(function(position) {
                    var lat = position.coords.latitude;
                    var lng = position.coords.longitude;

                    $http.get(Constants.getUrl() + '/shouts?apiKey=' + User.apiKey() + '&lng=' + lng + '&lat=' + lat)
                        .success(function (data) {
                            console.log("Got "+data.length+ " shouts");

                            data.forEach(function(shout){
                                if(readShouts.indexOf(shout.id) < 0){
                                    shouts.push(shout);
                                }
                            });
                            console.log(shouts.length+ " unread");
                            notifyCallback(null, true);
                        }).error(function (data, status, headers, config) {
                            if(status === 401){
                                console.log('Got 401...');
                                User.logout();
                            }
                        });
                }, function(err){

                });
            },
        }
    })

    .factory('User', function ($q, $http, $state, Constants) {
        var api_key;

        var getApiKey = function () {
            if (!api_key) {
                api_key = window.localStorage["apiKey"];
                console.log("Get api_key " + api_key);
            }
            return api_key;
        }

        return{
            apiKey: getApiKey,
            register: function () {
                var q = $q.defer();

                console.log('Post Register');
                $http.post(Constants.getUrl() + '/users')
                    .success(function (data) {
                        console.log(data);
                        api_key = data.apiKey;
                        window.localStorage["apiKey"] = api_key;
                        q.resolve(data);
                    }).error(function (data, status, headers, config) {
                        q.reject(status);
                    });

                return q.promise;
            },
            logout: function(){
                window.localStorage.clear();
                $state.go('intro');
            }
        }
    })

    .factory('Socket', function(User, Geo, $q, Constants){
        var socket;
        var listeners = 0;

        return{
            open: function () {
                var q = $q.defer();
                Geo.getLocation().then(function(position) {
                    socket = io.connect(Constants.getRootUrl(), {query: "apiKey="+User.apiKey()+"&lat="+position.coords.latitude+"&lng="+position.coords.longitude});
                    q.resolve();
                }, function(error){
                    q.reject();
                });
                return q.promise;
            },
            onNewShout: function (callback) {
                socket.on('shout', function (data) {
                    console.log('Got message!');
                    console.log(data);
                    callback(data);
                });
            },
            onListenersChange: function (callback) {
                socket.on('listener', function (data) {
                    console.log('Got Listener Change!');
                    console.log(data);
                    if(data.count){
                        listeners = data.count;
                    }
                    else if(data.add){
                        listeners++;
                    }
                    else if(data.remove){
                        listeners--;
                    }
                    callback(listeners);
                });
            }
        }
    })

    .factory('Geo', function ($q) {
        var cachedposition;
        var cachedreverse;

        Number.prototype.toRad = function() {
            return this * Math.PI / 180;
        }

        var calcDistance = function(lat1, lng1, lat2, lng2){
            console.log('Calculating Distance');
            var R = 6371000; // meters

            var x1 = lat2-lat1;
            var dLat = x1.toRad();
            var x2 = lng2-lng1;
            var dLon = x2.toRad();
            var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1.toRad()) * Math.cos(lat2.toRad()) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
            var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            return R * c;
        }

        return {
            reverseGeocode: function (lat, lng) {
                var q = $q.defer();

                if (!cachedreverse) {
                    var geocoder = new google.maps.Geocoder();
                    geocoder.geocode({
                        'latLng': new google.maps.LatLng(lat, lng)
                    }, function (results, status) {
                        if (status === google.maps.GeocoderStatus.OK) {
                            if (results.length > 0) {
                                var r = results[0];
                                var a, types;
                                cachedreverse = new Object();
                                var foundLocality = false;
                                var foundState = false;
                                for (var i = 0; i < r.address_components.length; i++) {
                                    a = r.address_components[i];
                                    types = a.types;
                                    for (var j = 0; j < types.length; j++) {
                                        if (!foundLocality && types[j] === 'locality') {
                                            foundLocality = true;
                                            cachedreverse.city = a.long_name;
                                        } else if (!foundState && types[j] === 'administrative_area_level_1') {
                                            foundState = true;
                                            cachedreverse.state = a.short_name;
                                        }
                                    }
                                }
                                console.log('Reverse', cachedreverse);
                                q.resolve(cachedreverse);
                            }
                        } else {
                            console.log('reverse fail', results, status);
                            q.reject(results);
                        }
                    })
                }
                else {
                    q.resolve(cachedreverse);
                }

                return q.promise;
            },
            getLocation: function () {
                var q = $q.defer();

                if (!cachedposition) {
                    console.log("Attempting to get new position");
                    navigator.geolocation.watchPosition(function (position) {
                        var distance = 0;
                        if(cachedposition) {
                            distance = calcDistance(cachedposition.coords.latitude, cachedposition.coords.longitude,
                                position.coords.latitude, position.coords.longitude);
                            console.log("Position update!!! Changed " + distance + "m");
                        }
                        if(distance > 10 || !cachedposition) {
                            cachedposition = position;
                            console.log("new position");
                            console.log(angular.toJson(position));
                        }

                        q.resolve(cachedposition);
                    }, function (error) {
                        console.log("position error");
                        console.log(angular.toJson(error));
                        q.reject(error);
                    });
                }
                else {
                    console.log('cached position');
                    q.resolve(cachedposition);
                }

                return q.promise;
            },
            getDistance: calcDistance
        };
    })

    .factory('Time', function () {
        return {
            timeSince: function(date){
                var seconds = Math.floor((new Date() - date) / 1000);

                var interval = Math.floor(seconds / 31536000);

                if (interval >= 1) {
                    return interval + " years ago";
                }
                interval = Math.floor(seconds / 2592000);
                if (interval >= 1) {
                    return interval + " months ago";
                }
                interval = Math.floor(seconds / 86400);
                if (interval >= 1) {
                    return interval + " days ago";
                }
                interval = Math.floor(seconds / 3600);
                if (interval >= 1) {
                    return interval + " hrs ago";
                }
                interval = Math.floor(seconds / 60);
                if (interval >= 1) {
                    return interval + " min ago";
                }
                return Math.floor(seconds) + " sec ago";
            }
        }
    })

    .factory('Instagram', function ($q, $http, User) {
        var clientID = '9b8bd0a7adaa48f18c9b56ce019cf5a6';

        return {
            getAround: function(location, callback) {
                if (location && callback) {

                    var endPoint = 'https://api.instagram.com/v1/media/search?lat='+location.lat+'&lng='+location.lng+'&client_id='+clientID+'&callback=JSON_CALLBACK';

                    $http.jsonp(endPoint).success(function(response) {
                        callback(response.data);
                    });
                }
                else {
                    console.log("Location and callback needed");
                }
            },
            getAt: function(location, callback) {
                if (location && callback) {

                    this.getLocationID(location, function(id){
                        if(id) {
                            var endPoint = 'https://api.instagram.com/v1/locations/' + id + '/media/recent?client_id=' + clientID + '&callback=JSON_CALLBACK';

                            $http.jsonp(endPoint).success(function (response) {
                                callback(response.data);
                                console.log(response.data);
                            });
                        }
                        else{
                            console.log("Error could not find instagram location ID");
                        }
                    })
                }
                else {
                    console.log("Location and callback needed");
                }
            },
            getLocationID: function(location, callback) {
                if (location && callback) {

                    var endPoint = 'https://api.instagram.com/v1/locations/search?'+'foursquare_v2_id='+location.foursquareID+'&client_id='+clientID+'&callback=JSON_CALLBACK';

                    $http.jsonp(endPoint).success(function(response) {
                        callback(response.data[0].id);
                    });
                }
                else {
                    console.log("Location and callback needed");
                }
            }
        }

    })
