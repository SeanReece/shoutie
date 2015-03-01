'use strict';
angular.module('shoutie.services', ['ngResource'])

    .factory('Shouts', function ($q, $http, User, Geo, Socket, $rootScope) {
        //var url = 'http://ec2-54-69-118-116.us-west-2.compute.amazonaws.com:8080';
        var url = 'http://192.168.1.152:8080/api';
        var shouts = [];
        var notifyCallback;
        var readShouts = {};

        Socket.onNewShout(function(data){
            shouts.push(data);
            $rootScope.$apply(function () {
                notifyCallback();
            });
            console.log('Got new Shout!');
        });

        return {
            getShouts: function(cb){
                notifyCallback = cb;
                var q = $q.defer();

                Geo.getLocation().then(function(position) {
                    var lat = position.coords.latitude;
                    var lng = position.coords.longitude;

                    $http.get(url + '/shouts?apiKey=' + User.apiKey() + '&lng=' + lng + '&lat=' + lat)
                        .success(function (data) {
                            console.log("Got "+data.length+ " shouts");
                            console.log(data);

                            data.forEach(function(shout){
                               if(!readShouts[shout.id]){
                                   shouts.push(shout);
                               }
                            });

                            q.resolve(shouts);
                        }).error(function (data, status, headers, config) {
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

                    $http.post(url + '/shouts?apiKey=' + User.apiKey(), shout)
                        .success(function (data) {
                            q.resolve(data);
                            notifyCallback();
                        }).error(function (data, status, headers, config) {
                            q.reject(status);
                        });
                }, function(err){
                    q.reject(err);
                });
                return q.promise;
            },
            readShout: function(shout){
                console.log('Reading Shout: '+shout.id);
                readShouts[shout.id] = true;

                $http.post(url+'/shouts/read?apiKey=' + User.apiKey(), {id : shout.id})
                    .success(function(data){
                        console.log("Read Shout "+data);
                    }).error(function(err){
                        console.log("Error reading Shout "+err);
                    });
            }
        }
    })

    .factory('User', function ($q, $http) {
        //var url = 'http://ec2-54-69-118-116.us-west-2.compute.amazonaws.com:8080';
        var url = 'http://192.168.1.152:8080/api';
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
                $http.post(url + '/users')
                    .success(function (data) {
                        console.log(data);
                        api_key = data.apiKey;
                        window.localStorage["apiKey"] = api_key;
                        q.resolve(data);
                    }).error(function (data, status, headers, config) {
                        q.reject(status);
                    });

                return q.promise;
            }
        }
    })

    .factory('Socket', function(){
        var socket = io.connect('http://192.168.1.152:8080');

        return{
            onNewShout: function (callback) {
                socket.on('shout', function (data) {
                    console.log('Got message!');
                    console.log(data);
                    callback(data);
                });
            }
        }
    })

    .factory('Geo', function ($q) {
        var cachedposition;
        var cachedreverse;
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
                    navigator.geolocation.getCurrentPosition(function (position) {
                        cachedposition = position;
                        console.log(position);
                        q.resolve(cachedposition);
                    }, function (error) {
                        console.log(error);
                        q.reject(error);
                    });
                }
                else {
                    q.resolve(cachedposition);
                }

                return q.promise;
            }
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